import { Module } from '@nestjs/common';
import { HttpQuarkAdminAdapter } from './http-quark-admin.adapter';
import { QuarkAdminPort } from './quark-admin.port';
import { QuarkProvisionService } from './quark-provision.service';

/**
 * Integración Quark (issuer/verifier) para provisioning por tenant.
 */
@Module({
  providers: [
    HttpQuarkAdminAdapter,
    {
      provide: QuarkAdminPort,
      useExisting: HttpQuarkAdminAdapter,
    },
    QuarkProvisionService,
  ],
  exports: [QuarkProvisionService, QuarkAdminPort],
})
export class QuarkModule {}
