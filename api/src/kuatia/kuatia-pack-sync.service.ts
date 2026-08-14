import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KuatiaHttpError } from './http-kuatia-admin.adapter';
import { KuatiaAdminPort } from './kuatia-admin.port';
import { KuatiaEnvService } from './kuatia-env.service';

const MAX_ERROR_LEN = 500;

/**
 * IDs canónicos de una configuration OID4VCI por pack.
 *
 * @remarks `configurationId = pack_{packId}`; `vct = urn:gymbro:pack:{packId}`.
 * @see docs/12-acceso-quark-oid4-diseno.md
 */
export function packKuatiaIds(packId: string): {
  configurationId: string;
  vct: string;
} {
  return {
    configurationId: `pack_${packId}`,
    vct: `urn:gymbro:pack:${packId}`,
  };
}

/**
 * Shape `credentialConfigurationsSupported` (dc+sd-jwt) alineado a Kuatia/Credo.
 */
export function buildPackCredentialConfiguration(
  configurationId: string,
  vct: string,
  packName: string,
): Record<string, unknown> {
  return {
    [configurationId]: {
      format: 'dc+sd-jwt',
      vct,
      display: [{ name: packName, locale: 'es' }],
      cryptographic_binding_methods_supported: ['did:jwk', 'jwk'],
      credential_signing_alg_values_supported: ['ES256'],
      proof_types_supported: {
        jwt: { proof_signing_alg_values_supported: ['ES256'] },
      },
    },
  };
}

/**
 * Sincroniza un pack hacia metadata OID4VCI del issuer compartido Kuatia (soft-fail).
 *
 * @remarks No bloquea create/update de pack si Kuatia falla. Issuer =
 * `KUATIA_ISSUER_WALLET_ID` (compartido; provision en consola Kuatia).
 */
@Injectable()
export class KuatiaPackSyncService {
  private readonly logger = new Logger(KuatiaPackSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kuatia: KuatiaAdminPort,
    private readonly kuatiaEnv: KuatiaEnvService,
  ) {}

  /**
   * PATCH metadata del issuer compartido con la configuration del pack.
   *
   * @param tenantId - Tenant dueño del pack (nunca del body confiado).
   * @param packId - Pack ya persistido.
   * @param packName - Nombre para `display` en la configuration.
   */
  async syncPackConfiguration(
    tenantId: string,
    packId: string,
    packName: string,
  ): Promise<void> {
    const { configurationId, vct } = packKuatiaIds(packId);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    if (!tenant) {
      await this.persistSyncFailure(
        packId,
        configurationId,
        vct,
        `Tenant ${tenantId} not found`,
      );
      return;
    }

    let issuerWalletId: string;
    try {
      issuerWalletId = this.kuatiaEnv.requireSharedIssuerWalletId();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.persistSyncFailure(packId, configurationId, vct, msg);
      return;
    }

    try {
      await this.kuatia.patchIssuerMetadata(issuerWalletId, {
        credentialConfigurationsSupported: buildPackCredentialConfiguration(
          configurationId,
          vct,
          packName,
        ),
      });

      await this.prisma.pack.update({
        where: { id: packId },
        data: {
          kuatiaConfigurationId: configurationId,
          kuatiaVct: vct,
          kuatiaSyncedAt: new Date(),
          kuatiaLastError: null,
        },
      });
    } catch (err) {
      const message = this.formatError(err);
      this.logger.warn(
        `Kuatia pack sync failed tenant=${tenant.slug} pack=${packId}: ${message}`,
      );
      await this.persistSyncFailure(packId, configurationId, vct, message);
    }
  }

  private async persistSyncFailure(
    packId: string,
    configurationId: string,
    vct: string,
    error: string,
  ): Promise<void> {
    await this.prisma.pack.update({
      where: { id: packId },
      data: {
        kuatiaConfigurationId: configurationId,
        kuatiaVct: vct,
        kuatiaSyncedAt: null,
        kuatiaLastError: error.slice(0, MAX_ERROR_LEN),
      },
    });
  }

  private formatError(err: unknown): string {
    if (err instanceof KuatiaHttpError) {
      const snippet = err.body ? ` ${err.body.slice(0, 200)}` : '';
      if (err.status === 404) {
        return `Issuer metadata/record missing on Kuatia.${snippet}`;
      }
      return `${err.message}${snippet}`;
    }
    if (err instanceof Error) {
      return err.message;
    }
    return String(err);
  }
}
