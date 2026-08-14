import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { CredentialOffersController } from './credential-offers.controller';
import { HttpKuatiaAdminAdapter } from './http-kuatia-admin.adapter';
import { KuatiaAdminPort } from './kuatia-admin.port';
import { KuatiaEnvService } from './kuatia-env.service';
import { KuatiaOfferService } from './kuatia-offer.service';
import { KuatiaPackSyncService } from './kuatia-pack-sync.service';
import { KuatiaStaffOfferService } from './kuatia-staff-offer.service';
import { KuatiaStaffSyncService } from './kuatia-staff-sync.service';

/**
 * Integración Kuatia (issuer/verifier compartidos, metadata packs/staff, offers OID4VCI).
 *
 * @see https://kuatia.xyz/docs
 */
@Module({
  imports: [AuthModule, RolesModule],
  controllers: [CredentialOffersController],
  providers: [
    HttpKuatiaAdminAdapter,
    {
      provide: KuatiaAdminPort,
      useExisting: HttpKuatiaAdminAdapter,
    },
    KuatiaEnvService,
    KuatiaPackSyncService,
    KuatiaOfferService,
    KuatiaStaffSyncService,
    KuatiaStaffOfferService,
  ],
  exports: [
    KuatiaEnvService,
    KuatiaPackSyncService,
    KuatiaOfferService,
    KuatiaStaffSyncService,
    KuatiaStaffOfferService,
    KuatiaAdminPort,
  ],
})
export class KuatiaModule {}
