import { Module } from '@nestjs/common';
import { HttpQuarkAdminAdapter } from './http-quark-admin.adapter';
import { QuarkAdminPort } from './quark-admin.port';
import { QuarkPackSyncService } from './quark-pack-sync.service';
import { QuarkProvisionService } from './quark-provision.service';

/**
 * Integración Quark (issuer/verifier + sync metadata de packs).
 */
@Module({
  providers: [
    HttpQuarkAdminAdapter,
    {
      provide: QuarkAdminPort,
      useExisting: HttpQuarkAdminAdapter,
    },
    QuarkProvisionService,
    QuarkPackSyncService,
  ],
  exports: [QuarkProvisionService, QuarkPackSyncService, QuarkAdminPort],
})
export class QuarkModule {}