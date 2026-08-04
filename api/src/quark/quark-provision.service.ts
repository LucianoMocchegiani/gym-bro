import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QuarkProvisionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QuarkHttpError } from './http-quark-admin.adapter';
import { QuarkAdminPort } from './quark-admin.port';

const MAX_ERROR_LEN = 500;

/**
 * Resultado de provisioning Quark para un tenant.
 */
export type QuarkProvisionResult = {
  status: QuarkProvisionStatus;
  issuerWalletId: string | null;
  issuerDid: string | null;
  verifierWalletId: string | null;
  verifierDid: string | null;
  lastError: string | null;
  provisionedAt: Date | null;
};

/**
 * Crea (o reconcilia) issuer + verifier Quark para un gym.
 *
 * @remarks Soft-fail: errores se persisten en `quark_*` sin abortar el alta del tenant.
 * IDs: `gymbro-iss-{slug}` / `gymbro-ver-{slug}`.
 * @see docs/12-acceso-quark-oid4-diseno.md
 */
@Injectable()
export class QuarkProvisionService {
  private readonly logger = new Logger(QuarkProvisionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly quark: QuarkAdminPort,
    private readonly config: ConfigService,
  ) {}

  /**
   * ¿Está habilitado el provisioning? (`QUARK_PROVISION_ENABLED`, default true).
   */
  isEnabled(): boolean {
    const raw = this.config.get<string>('QUARK_PROVISION_ENABLED');
    if (raw === undefined || raw === null || raw === '') {
      return true;
    }
    return raw !== 'false' && raw !== '0';
  }

  /**
   * Wallet IDs canónicos por slug de tenant.
   */
  walletIdsForSlug(slug: string): { issuerId: string; verifierId: string } {
    return {
      issuerId: `gymbro-iss-${slug}`,
      verifierId: `gymbro-ver-${slug}`,
    };
  }

  /**
   * Provisiona issuer+verifier y actualiza columnas Quark del tenant.
   *
   * @remarks Idempotente: si Quark responde 409, reconcilia vía listado.
   * Si `QUARK_PROVISION_ENABLED=false`, marca MISSING con mensaje y no llama HTTP.
   */
  async provisionTenant(tenantId: string): Promise<QuarkProvisionResult> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        slug: true,
        quarkIssuerWalletId: true,
        quarkIssuerDid: true,
        quarkVerifierWalletId: true,
        quarkVerifierDid: true,
        quarkStatus: true,
      },
    });
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found for Quark provision`);
    }

    if (!this.isEnabled()) {
      return this.persistMissing(
        tenantId,
        'QUARK_PROVISION_ENABLED=false',
      );
    }

    const { issuerId, verifierId } = this.walletIdsForSlug(tenant.slug);

    let issuerWalletId = tenant.quarkIssuerWalletId;
    let issuerDid = tenant.quarkIssuerDid;
    let verifierWalletId = tenant.quarkVerifierWalletId;
    let verifierDid = tenant.quarkVerifierDid;

    try {
      if (issuerWalletId) {
        const oid4 = await this.quark.listIssuerRecords(
          issuerWalletId,
          'OpenId4VcIssuerRecord',
        );
        if (oid4.total < 1) {
          this.logger.warn(
            `Issuer ${issuerWalletId} sin OpenId4VcIssuerRecord; se recrea con oid4vc`,
          );
          issuerWalletId = null;
          issuerDid = null;
        }
      }

      if (!issuerWalletId) {
        const created = await this.ensureIssuer(issuerId, tenant.slug);
        issuerWalletId = created.issuerId;
        issuerDid = created.did;
        const oid4 = await this.quark.listIssuerRecords(
          issuerWalletId,
          'OpenId4VcIssuerRecord',
        );
        if (oid4.total < 1) {
          throw new Error(
            `Issuer '${issuerWalletId}' sin OpenId4VcIssuerRecord (ghost o alta sin oid4vc). Reiniciá quark-issuer y reintentá.`,
          );
        }
      }

      if (verifierWalletId) {
        const oid4 = await this.quark.listVerifierRecords(
          verifierWalletId,
          'OpenId4VcVerifierRecord',
        );
        if (oid4.total < 1) {
          this.logger.warn(
            `Verifier ${verifierWalletId} sin OpenId4VcVerifierRecord; se recrea con oid4vp`,
          );
          verifierWalletId = null;
          verifierDid = null;
        }
      }

      if (!verifierWalletId) {
        const created = await this.ensureVerifier(verifierId);
        verifierWalletId = created.verifierId;
        verifierDid = created.did;
        const oid4 = await this.quark.listVerifierRecords(
          verifierWalletId,
          'OpenId4VcVerifierRecord',
        );
        if (oid4.total < 1) {
          throw new Error(
            `Verifier '${verifierWalletId}' sin OpenId4VcVerifierRecord (alta sin oid4vp o wallet incompleta). Wipe DB quarkid_verifier y reintentá.`,
          );
        }
      }

      const ready =
        Boolean(issuerWalletId) && Boolean(verifierWalletId);

      if (!ready) {
        return this.persistMissing(
          tenantId,
          'Issuer or verifier missing after provision attempt',
          {
            issuerWalletId,
            issuerDid,
            verifierWalletId,
            verifierDid,
          },
        );
      }

      const provisionedAt = new Date();
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          quarkStatus: QuarkProvisionStatus.READY,
          quarkIssuerWalletId: issuerWalletId,
          quarkIssuerDid: issuerDid,
          quarkVerifierWalletId: verifierWalletId,
          quarkVerifierDid: verifierDid,
          quarkLastError: null,
          quarkProvisionedAt: provisionedAt,
        },
      });

      return {
        status: QuarkProvisionStatus.READY,
        issuerWalletId,
        issuerDid,
        verifierWalletId,
        verifierDid,
        lastError: null,
        provisionedAt,
      };
    } catch (err) {
      const message = this.formatError(err);
      this.logger.warn(
        `Quark provision failed tenant=${tenantId} slug=${tenant.slug}: ${message}`,
      );
      return this.persistMissing(tenantId, message, {
        issuerWalletId,
        issuerDid,
        verifierWalletId,
        verifierDid,
      });
    }
  }

  private async ensureIssuer(
    issuerId: string,
    slug: string,
  ): Promise<{
    issuerId: string;
    did: string | null;
  }> {
    /** Sin `oid4vc`, Quark no crea `OpenId4VcIssuerRecord` → PATCH metadata falla. */
    const oid4vc = {
      display: [{ name: `GymBro ${slug}`, locale: 'es' }],
      credentialConfigurationsSupported: {},
    };
    try {
      const created = await this.quark.createIssuer(issuerId, oid4vc);
      return { issuerId: created.issuerId, did: created.did };
    } catch (err) {
      if (err instanceof QuarkHttpError && err.status === 409) {
        const list = await this.quark.listIssuers();
        const found = list.find((i) => i.issuerId === issuerId);
        if (found) {
          try {
            await this.quark.listIssuerRecords(
              found.issuerId,
              'OpenId4VcIssuerRecord',
            );
          } catch (probeErr) {
            throw new Error(
              `Issuer '${issuerId}' es un ghost en memoria Quark (TenantRecord ausente). Reiniciá quark-issuer y limpiá quark_issuer_wallet_id. Detalle: ${this.formatError(probeErr)}`,
            );
          }
          return { issuerId: found.issuerId, did: found.did };
        }
      }
      throw err;
    }
  }

  private async ensureVerifier(verifierId: string): Promise<{
    verifierId: string;
    did: string | null;
  }> {
    try {
      const created = await this.quark.createVerifier(verifierId, {
        clientMetadata: { client_name: 'GymBro' },
      });
      return { verifierId: created.verifierId, did: created.did };
    } catch (err) {
      if (err instanceof QuarkHttpError && err.status === 409) {
        const list = await this.quark.listVerifiers();
        const found = list.find((v) => v.verifierId === verifierId);
        if (found) {
          const oid4 = await this.quark.listVerifierRecords(
            found.verifierId,
            'OpenId4VcVerifierRecord',
          );
          if (oid4.total < 1) {
            throw new Error(
              `Verifier '${verifierId}' ya existe sin OpenId4VcVerifierRecord. Wipe DB quarkid_verifier (o borrá la wallet) y reintentá con oid4vp.`,
            );
          }
          return { verifierId: found.verifierId, did: found.did };
        }
      }
      throw err;
    }
  }

  private async persistMissing(
    tenantId: string,
    error: string,
    partial?: {
      issuerWalletId?: string | null;
      issuerDid?: string | null;
      verifierWalletId?: string | null;
      verifierDid?: string | null;
    },
  ): Promise<QuarkProvisionResult> {
    const lastError = error.slice(0, MAX_ERROR_LEN);
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        quarkStatus: QuarkProvisionStatus.MISSING,
        quarkIssuerWalletId: partial?.issuerWalletId ?? undefined,
        quarkIssuerDid: partial?.issuerDid ?? undefined,
        quarkVerifierWalletId: partial?.verifierWalletId ?? undefined,
        quarkVerifierDid: partial?.verifierDid ?? undefined,
        quarkLastError: lastError,
      },
    });
    return {
      status: QuarkProvisionStatus.MISSING,
      issuerWalletId: partial?.issuerWalletId ?? null,
      issuerDid: partial?.issuerDid ?? null,
      verifierWalletId: partial?.verifierWalletId ?? null,
      verifierDid: partial?.verifierDid ?? null,
      lastError,
      provisionedAt: null,
    };
  }

  private formatError(err: unknown): string {
    if (err instanceof QuarkHttpError) {
      const snippet = err.body ? ` ${err.body.slice(0, 200)}` : '';
      return `${err.message}${snippet}`;
    }
    if (err instanceof Error) {
      return err.message;
    }
    return String(err);
  }
}
