import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KuatiaHttpError } from '../kuatia/http-kuatia-admin.adapter';
import { KuatiaAdminPort } from '../kuatia/kuatia-admin.port';
import { KuatiaEnvService } from '../kuatia/kuatia-env.service';
import { packKuatiaIds } from '../kuatia/kuatia-pack-sync.service';
import { staffKuatiaIds } from '../kuatia/kuatia-staff-sync.service';
import { AccessVerifyService } from './access-verify.service';
import {
  ACCESS_REASON,
  AccessOid4VpRequestResult,
  AccessOid4VpSessionResult,
  AccessVerifyResult,
} from './access.types';

/**
 * Prefijo de `credentialRef` en intentos originados por OID4VP.
 *
 * @remarks Idempotencia del poll: un attempt por `oid4vp:{sessionId}`.
 */
export function oid4vpCredentialRef(sessionId: string): string {
  return `oid4vp:${sessionId}`;
}

/**
 * Puerta OID4VP modo B: crear request + poll sesión → evaluate (CU-ACC-001).
 *
 * @remarks QR = `requestUri`. Identidad = claim `memberId` (afiliado) o `staffId`
 * (staff molinete). Verifier = `KUATIA_VERIFIER_WALLET_ID`.
 * @see docs/12-acceso-quark-oid4-diseno.md
 */
@Injectable()
export class AccessOid4VpService {
  private readonly logger = new Logger(AccessOid4VpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kuatia: KuatiaAdminPort,
    private readonly kuatiaEnv: KuatiaEnvService,
    private readonly accessVerify: AccessVerifyService,
  ) {}

  /**
   * Crea authorization request OID4VP (pack afiliado **o** VC staff).
   *
   * @remarks DCQL: dos credentials + `credential_sets` (OR). Staff VCT =
   * `urn:gymbro:staff:{tenantId}`.
   */
  async createRequest(tenantId: string): Promise<AccessOid4VpRequestResult> {
    const verifierWalletId = this.requireVerifierWallet();
    const packs = await this.prisma.pack.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const packVcts = packs.map((p) => packKuatiaIds(p.id).vct);
    const staffVct = staffKuatiaIds(tenantId).vct;

    const packCredential: Record<string, unknown> = {
      id: 'gymbro_pack',
      format: 'dc+sd-jwt',
      claims: [
        { path: ['memberId'] },
        { path: ['tenantId'], values: [tenantId] },
      ],
    };
    if (packVcts.length > 0) {
      packCredential.meta = { vct_values: packVcts };
    }

    const staffCredential: Record<string, unknown> = {
      id: 'gymbro_staff',
      format: 'dc+sd-jwt',
      meta: { vct_values: [staffVct] },
      claims: [
        { path: ['staffId'] },
        { path: ['tenantId'], values: [tenantId] },
      ],
    };

    const dcqlQuery = {
      credentials: [packCredential, staffCredential],
      credential_sets: [
        {
          options: [['gymbro_pack'], ['gymbro_staff']],
          required: true,
        },
      ],
    };

    try {
      const created = await this.kuatia.createPresentationRequest(
        verifierWalletId,
        {
          dcqlQuery,
          responseMode: 'direct_post',
          requestSignerMethod: 'did',
        },
      );
      return {
        requestUri: created.requestUri,
        verificationSessionId: created.verificationSessionId,
        scanMode: 'member_scans_gym',
      };
    } catch (err) {
      throw this.mapKuatiaError(err, 'create OID4VP request');
    }
  }

  /**
   * Consulta la sesión; si hay `vp_token`, mapea claims y evalúa afiliado o staff.
   */
  async getSession(
    tenantId: string,
    verificationSessionId: string,
    actorStaffId: string | null,
  ): Promise<AccessOid4VpSessionResult> {
    const sessionId = verificationSessionId.trim();
    if (!sessionId) {
      throw new BadRequestException('verificationSessionId required');
    }

    const existing = await this.findAttemptResult(tenantId, sessionId);
    if (existing) {
      return { status: 'done', state: 'Done', result: existing };
    }

    const verifierWalletId = this.requireVerifierWallet();

    let session;
    try {
      session = await this.kuatia.getVerificationSession(
        verifierWalletId,
        sessionId,
      );
    } catch (err) {
      throw this.mapKuatiaError(err, 'get OID4VP session');
    }

    const state = session.state;
    if (state === 'Error' || state === 'Abandoned') {
      return {
        status: 'error',
        state,
        reasonCode: ACCESS_REASON.payloadInvalido,
      };
    }

    if (!session.presented) {
      return { status: 'pending', state };
    }

    const again = await this.findAttemptResult(tenantId, sessionId);
    if (again) {
      return { status: 'done', state, result: again };
    }

    const claims = session.claims;
    const staffId =
      typeof claims.staffId === 'string' ? claims.staffId.trim() : '';
    const memberId =
      typeof claims.memberId === 'string' ? claims.memberId.trim() : '';
    const claimTenantId =
      typeof claims.tenantId === 'string' ? claims.tenantId.trim() : '';

    if (claimTenantId && claimTenantId !== tenantId) {
      const denied = await this.accessVerify.persistOid4VpDenied({
        tenantId,
        memberId: memberId || null,
        subjectStaffId: staffId || null,
        credentialRef: oid4vpCredentialRef(sessionId),
        actorStaffId,
        reasonCode: ACCESS_REASON.tenantMismatch,
      });
      return { status: 'done', state, result: denied };
    }

    // Preferir staff si ambos (caso anómalo).
    if (staffId) {
      const result = await this.accessVerify.evaluateStaffOid4VpPresentation({
        tenantId,
        staffUserId: staffId,
        credentialRef: oid4vpCredentialRef(sessionId),
        actorStaffId,
      });
      return { status: 'done', state, result };
    }

    if (!memberId) {
      const denied = await this.accessVerify.persistOid4VpDenied({
        tenantId,
        memberId: null,
        subjectStaffId: null,
        credentialRef: oid4vpCredentialRef(sessionId),
        actorStaffId,
        reasonCode: ACCESS_REASON.payloadInvalido,
      });
      return { status: 'done', state, result: denied };
    }

    const result = await this.accessVerify.evaluateOid4VpPresentation({
      tenantId,
      memberId,
      credentialRef: oid4vpCredentialRef(sessionId),
      actorStaffId,
    });
    return { status: 'done', state, result };
  }

  private async findAttemptResult(
    tenantId: string,
    sessionId: string,
  ): Promise<AccessVerifyResult | null> {
    const row = await this.prisma.accessAttempt.findFirst({
      where: {
        tenantId,
        credentialRef: oid4vpCredentialRef(sessionId),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        member: { select: { name: true, email: true } },
        subjectStaff: { select: { name: true, email: true } },
      },
    });
    if (!row) {
      return null;
    }
    return this.accessVerify.toVerifyResultFromAttempt(
      row,
      row.member,
      row.subjectStaff,
    );
  }

  private requireVerifierWallet(): string {
    try {
      return this.kuatiaEnv.requireSharedVerifierWalletId();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ServiceUnavailableException(
        `Kuatia verifier no configurado (${msg}). Revisá KUATIA_VERIFIER_WALLET_ID.`,
      );
    }
  }

  private mapKuatiaError(err: unknown, op: string): Error {
    if (err instanceof KuatiaHttpError) {
      this.logger.warn(
        `Kuatia ${op} failed: ${err.status} ${err.body.slice(0, 200)}`,
      );
      if (err.status === 0) {
        return new ServiceUnavailableException('Kuatia verifier unreachable');
      }
      if (err.status === 404) {
        return new BadRequestException('OID4VP session not found');
      }
      return new BadRequestException(`Kuatia OID4VP error (${err.status})`);
    }
    this.logger.warn(
      `Kuatia ${op} unexpected: ${err instanceof Error ? err.message : String(err)}`,
    );
    return new ServiceUnavailableException('Kuatia OID4VP unavailable');
  }
}
