import { Injectable, Logger } from '@nestjs/common';
import { AccessProvider } from '@prisma/client';
import { KuatiaOfferService } from '../kuatia/kuatia-offer.service';
import { KuatiaPackSyncService } from '../kuatia/kuatia-pack-sync.service';
import { TenantSettingsService } from '../tenant-settings/tenant-settings.service';
import { CredentialIssuerPort } from './credential-issuer.port';

/**
 * Emisor según el sistema de puerta del gym.
 *
 * @remarks KUATIA → adapter HTTP Kuatia (metadata + oferta OID4VCI).
 * ZKTECO → no emite: la persona se identifica en el aparato (RN-ACC-010).
 */
@Injectable()
export class TenantCredentialIssuer extends CredentialIssuerPort {
  private readonly logger = new Logger(TenantCredentialIssuer.name);

  constructor(
    private readonly tenantSettings: TenantSettingsService,
    private readonly kuatiaPackSync: KuatiaPackSyncService,
    private readonly kuatiaOffers: KuatiaOfferService,
  ) {
    super();
  }

  async syncPackConfiguration(
    tenantId: string,
    packId: string,
    packName: string,
  ): Promise<void> {
    if (!(await this.emitsInKuatia(tenantId))) {
      this.logger.debug(`Skip pack sync (ZKTeco) tenant=${tenantId}`);
      return;
    }
    await this.kuatiaPackSync.syncPackConfiguration(tenantId, packId, packName);
  }

  async ensureOfferForContract(
    tenantId: string,
    contractId: string,
    options?: { force?: boolean },
  ): Promise<void> {
    if (!(await this.emitsInKuatia(tenantId))) {
      this.logger.debug(`Skip credential offer (ZKTeco) tenant=${tenantId}`);
      return;
    }
    await this.kuatiaOffers.ensureOfferForContract(
      tenantId,
      contractId,
      options,
    );
  }

  private async emitsInKuatia(tenantId: string): Promise<boolean> {
    const provider = await this.tenantSettings.getAccessProvider(tenantId);
    return provider === AccessProvider.KUATIA;
  }
}
