import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { KuatiaModule } from '../kuatia/kuatia.module';
import { RolesModule } from '../roles/roles.module';
import { TenantSettingsModule } from '../tenant-settings/tenant-settings.module';
import { AccessOid4VpService } from './access-oid4vp.service';
import { AccessVerifyController } from './access-verify.controller';
import { AccessVerifyService } from './access-verify.service';

/**
 * Acceso puerta: OID4VP (Quark) + evaluate + pase manual + historial.
 *
 * @remarks Stubs de vínculo / check-in retirados. Identidad = claim `memberId` de la VC.
 */
@Module({
  imports: [
    AuthModule,
    RolesModule,
    AuditModule,
    TenantSettingsModule,
    KuatiaModule,
  ],
  controllers: [AccessVerifyController],
  providers: [AccessVerifyService, AccessOid4VpService],
  exports: [AccessVerifyService, AccessOid4VpService],
})
export class AccessModule {}
