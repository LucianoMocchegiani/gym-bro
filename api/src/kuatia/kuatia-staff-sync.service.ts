import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KuatiaHttpError } from './http-kuatia-admin.adapter';
import { KuatiaAdminPort } from './kuatia-admin.port';
import { KuatiaEnvService } from './kuatia-env.service';

/**
 * IDs canónicos de configuration OID4VCI para credencial de acceso staff.
 *
 * @remarks `configurationId = staff_{tenantId}`; `vct = urn:gymbro:staff:{tenantId}`.
 */
export function staffKuatiaIds(tenantId: string): {
  configurationId: string;
  vct: string;
} {
  return {
    configurationId: `staff_${tenantId}`,
    vct: `urn:gymbro:staff:${tenantId}`,
  };
}

/**
 * Shape `credentialConfigurationsSupported` para VC staff (dc+sd-jwt).
 */
export function buildStaffCredentialConfiguration(
  configurationId: string,
  vct: string,
  displayName: string,
): Record<string, unknown> {
  return {
    [configurationId]: {
      format: 'dc+sd-jwt',
      vct,
      display: [{ name: displayName, locale: 'es' }],
      cryptographic_binding_methods_supported: ['did:jwk', 'jwk'],
      credential_signing_alg_values_supported: ['ES256'],
      proof_types_supported: {
        jwt: { proof_signing_alg_values_supported: ['ES256'] },
      },
    },
  };
}

/**
 * Sincroniza metadata OID4VCI de credencial staff del tenant (soft-fail).
 */
@Injectable()
export class KuatiaStaffSyncService {
  private readonly logger = new Logger(KuatiaStaffSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kuatia: KuatiaAdminPort,
    private readonly kuatiaEnv: KuatiaEnvService,
  ) {}

  /**
   * PATCH issuer compartido con configuration `staff_{tenantId}`.
   *
   * @returns true si el sync OK; false si soft-fail (caller puede seguir o marcar FAILED).
   */
  async syncStaffConfiguration(tenantId: string): Promise<boolean> {
    const { configurationId, vct } = staffKuatiaIds(tenantId);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true },
    });
    if (!tenant) {
      this.logger.warn(`Staff Kuatia sync: tenant ${tenantId} not found`);
      return false;
    }

    let issuerWalletId: string;
    try {
      issuerWalletId = this.kuatiaEnv.requireSharedIssuerWalletId();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Staff Kuatia sync: ${msg}`);
      return false;
    }

    try {
      await this.kuatia.patchIssuerMetadata(issuerWalletId, {
        credentialConfigurationsSupported: buildStaffCredentialConfiguration(
          configurationId,
          vct,
          `Staff ${tenant.name}`,
        ),
      });
      return true;
    } catch (err) {
      const message =
        err instanceof KuatiaHttpError
          ? `Kuatia ${err.status}: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err);
      this.logger.warn(
        `Staff Kuatia sync failed tenant=${tenantId}: ${message}`,
      );
      return false;
    }
  }
}
