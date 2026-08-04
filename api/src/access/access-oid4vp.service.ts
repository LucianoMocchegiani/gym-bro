import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QuarkProvisionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QuarkHttpError } from '../quark/http-quark-admin.adapter';
import { QuarkAdminPort } from '../quark/quark-admin.port';
import { packQuarkIds } from '../quark/quark-pack-sync.service';
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
 * @remarks El QR es `requestUri` Quark. Identidad = claim `memberId` de la VC.
 * @see docs/12-acceso-quark-oid4-diseno.md paso 4
 */
@Injectable()
export class AccessOid4VpService {
  private readonly logger = new Logger(AccessOid4VpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly quark: QuarkAdminPort,
    private readonly accessVerify: AccessVerifyService,
  ) {}

  /**
   * Crea un authorization request OID4VP para el verifier del tenant.
   *
   * @remarks DCQL pide una VC `dc+sd-jwt` de packs del gym + claims `memberId`/`tenantId`.
   * @throws {ServiceUnavailableException} Tenant sin Quark READY / verifier.
   * @throws {BadRequestException} Quark rechaza el request.
   */
  async createRequest(
    tenantId: string,
  ): Promise<AccessOid4VpRequestResult> {
    const verifierWalletId = await this.requireVerifierWallet(tenantId);
    const packs = await this.prisma.pack.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const vctValues = packs.map((p) => packQuarkIds(p.id).vct);

    const credentialQuery: Record<string, unknown> = {
      id: 'gymbro_pack',
      format: 'dc+sd-jwt',
      claims: [
        { path: ['memberId'] },
        { path: ['tenantId'], values: [tenantId] },
      ],
    };
    if (vctValues.length > 0) {
      credentialQuery.meta = { vct_values: vctValues };
    }

    const dcqlQuery = { credentials: [credentialQuery] };

    try {
      const created = await this.quark.createPresentationRequest(
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
      throw this.mapQuarkError(err, 'create OID4VP request');
    }
  }

  /**
   * Consulta la sesión Quark; si ya hay `vp_token`, mapea claims y evalúa.
   *
   * @remarks Pendiente = sin presentación (`presented=false`). Verificado = hay
   * `vp_token` decodificado (Postman 02.7). Poll idempotente vía `oid4vp:{sessionId}`.
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

    const verifierWalletId = await this.requireVerifierWallet(tenantId);

    let session;
    try {
      session = await this.quark.getVerificationSession(
        verifierWalletId,
        sessionId,
      );
    } catch (err) {
      throw this.mapQuarkError(err, 'get OID4VP session');
    }

    const state = session.state;
    if (state === 'Error' || state === 'Abandoned') {
      return {
        status: 'error',
        state,
        reasonCode: ACCESS_REASON.payloadInvalido,
      };
    }

    // Sin vp_token: todavía no presentó (aunque el state intermedio cambie).
    if (!session.presented) {
      return { status: 'pending', state };
    }

    const again = await this.findAttemptResult(tenantId, sessionId);
    if (again) {
      return { status: 'done', state, result: again };
    }

    const claims = session.claims;
    const memberId =
      typeof claims.memberId === 'string' ? claims.memberId.trim() : '';
    const claimTenantId =
      typeof claims.tenantId === 'string' ? claims.tenantId.trim() : '';

    if (!memberId) {
      const denied = await this.accessVerify.persistOid4VpDenied({
        tenantId,
        memberId: null,
        credentialRef: oid4vpCredentialRef(sessionId),
        actorStaffId,
        reasonCode: ACCESS_REASON.payloadInvalido,
      });
      return { status: 'done', state, result: denied };
    }

    if (claimTenantId && claimTenantId !== tenantId) {
      const denied = await this.accessVerify.persistOid4VpDenied({
        tenantId,
        memberId,
        credentialRef: oid4vpCredentialRef(sessionId),
        actorStaffId,
        reasonCode: ACCESS_REASON.tenantMismatch,
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
      },
    });
    if (!row) {
      return null;
    }
    return this.accessVerify.toVerifyResultFromAttempt(row, row.member);
  }

  private async requireVerifierWallet(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        quarkStatus: true,
        quarkVerifierWalletId: true,
      },
    });
    if (
      !tenant ||
      tenant.quarkStatus !== QuarkProvisionStatus.READY ||
      !tenant.quarkVerifierWalletId
    ) {
      throw new ServiceUnavailableException(
        'Quark verifier no está READY para este gym. Provisioná el tenant.',
      );
    }
    return tenant.quarkVerifierWalletId;
  }

  private mapQuarkError(err: unknown, op: string): Error {
    if (err instanceof QuarkHttpError) {
      this.logger.warn(`Quark ${op} failed: ${err.status} ${err.body.slice(0, 200)}`);
      if (err.status === 0) {
        return new ServiceUnavailableException('Quark verifier unreachable');
      }
      if (err.status === 404) {
        return new BadRequestException('OID4VP session not found');
      }
      return new BadRequestException(`Quark OID4VP error (${err.status})`);
    }
    this.logger.warn(
      `Quark ${op} unexpected: ${err instanceof Error ? err.message : String(err)}`,
    );
    return new ServiceUnavailableException('Quark OID4VP unavailable');
  }
}
