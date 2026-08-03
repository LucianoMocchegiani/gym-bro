import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { CredentialOffersController } from './credential-offers.controller';
import { HttpQuarkAdminAdapter } from './http-quark-admin.adapter';
import { QuarkAdminPort } from './quark-admin.port';
import { QuarkOfferService } from './quark-offer.service';
import { QuarkPackSyncService } from './quark-pack-sync.service';
import { QuarkProvisionService } from './quark-provision.service';

/**
 * Integración Quark (issuer/verifier, metadata packs, offers OID4VCI).
 */
@Module({
  imports: [AuthModule, RolesModule],
  controllers: [CredentialOffersController],
  providers: [
    HttpQuarkAdminAdapter,
    {
      provide: QuarkAdminPort,
      useExisting: HttpQuarkAdminAdapter,
    },
    QuarkProvisionService,
    QuarkPackSyncService,
    QuarkOfferService,
  ],
  exports: [
    QuarkProvisionService,
    QuarkPackSyncService,
    QuarkOfferService,
    QuarkAdminPort,
  ],
})
export class QuarkModule {}
