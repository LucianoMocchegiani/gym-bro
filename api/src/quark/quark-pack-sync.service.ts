import { Injectable, Logger } from '@nestjs/common';
import { QuarkProvisionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QuarkHttpError } from './http-quark-admin.adapter';
import { QuarkAdminPort } from './quark-admin.port';

const MAX_ERROR_LEN = 500;

/**
 * IDs canónicos de una configuration OID4VCI por pack.
 *
 * @remarks `configurationId = pack_{packId}`; `vct = urn:gymbro:pack:{packId}`.
 * @see docs/12-acceso-quark-oid4-diseno.md
 */
export function packQuarkIds(packId: string): {
  configurationId: string;
  vct: string;
} {
  return {
    configurationId: `pack_${packId}`,
    vct: `urn:gymbro:pack:${packId}`,
  };
}

/**
 * Shape `credentialConfigurationsSupported` (dc+sd-jwt) alineado a Quark/Credo.
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
 * Sincroniza un pack hacia metadata OID4VCI del issuer del gym (soft-fail).
 *
 * @remarks No bloquea create/update de pack si Quark falla o el tenant está MISSING.
 * Requiere `OpenId4VcIssuerRecord` (issuer creado con `oid4vc` en provision).
 */
@Injectable()
export class QuarkPackSyncService {
  private readonly logger = new Logger(QuarkPackSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly quark: QuarkAdminPort,
  ) {}

  /**
   * PATCH metadata del issuer con la configuration del pack y persiste refs en `packs`.
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
    const { configurationId, vct } = packQuarkIds(packId);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        slug: true,
        quarkStatus: true,
        quarkIssuerWalletId: true,
      },
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

    if (
      tenant.quarkStatus !== QuarkProvisionStatus.READY ||
      !tenant.quarkIssuerWalletId
    ) {
      await this.persistSyncFailure(
        packId,
        configurationId,
        vct,
        `Tenant Quark not READY (status=${tenant.quarkStatus})`,
      );
      return;
    }

    try {
      await this.quark.patchIssuerMetadata(tenant.quarkIssuerWalletId, {
        credentialConfigurationsSupported: buildPackCredentialConfiguration(
          configurationId,
          vct,
          packName,
        ),
      });

      await this.prisma.pack.update({
        where: { id: packId },
        data: {
          quarkConfigurationId: configurationId,
          quarkVct: vct,
          quarkSyncedAt: new Date(),
          quarkLastError: null,
        },
      });
    } catch (err) {
      const message = this.formatError(err);
      this.logger.warn(
        `Quark pack sync failed tenant=${tenant.slug} pack=${packId}: ${message}`,
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
        quarkConfigurationId: configurationId,
        quarkVct: vct,
        quarkSyncedAt: null,
        quarkLastError: error.slice(0, MAX_ERROR_LEN),
      },
    });
  }

  private formatError(err: unknown): string {
    if (err instanceof QuarkHttpError) {
      const snippet = err.body ? ` ${err.body.slice(0, 200)}` : '';
      if (err.status === 404) {
        return `OpenId4VcIssuerRecord missing (re-create issuer with oid4vc).${snippet}`;
      }
      return `${err.message}${snippet}`;
    }
    if (err instanceof Error) {
      return err.message;
    }
    return String(err);
  }
}
