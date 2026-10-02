import { Module } from '@nestjs/common';
import { AccessProvidersModule } from '../access-providers/access-providers.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { KuatiaModule } from '../kuatia/kuatia.module';
import { RolesModule } from '../roles/roles.module';
import { TenantSettingsModule } from '../tenant-settings/tenant-settings.module';
import { AccessIdentityLinksService } from './access-identity-links.service';
import { AccessOid4VpService } from './access-oid4vp.service';
import { AccessVerifyController } from './access-verify.controller';
import { AccessVerifyService } from './access-verify.service';
import { AccessZktecoController } from './access-zkteco.controller';
import { AccessZktecoService } from './access-zkteco.service';

/**
 * Acceso puerta: reglas de ingreso (un solo evaluate) + adapters de identidad.
 *
 * @remarks Kuatia (OID4VP, QR en `/puerta`) y ZKTeco (eventos del aparato)
 * resuelven quién es y entran por `AccessVerifyService.evaluateSubject`.
 */
@Module({
  imports: [
    AuthModule,
    RolesModule,
    AuditModule,
    TenantSettingsModule,
    KuatiaModule,
    AccessProvidersModule,
  ],
  controllers: [AccessVerifyController, AccessZktecoController],
  providers: [
    AccessVerifyService,
    AccessOid4VpService,
    AccessZktecoService,
    AccessIdentityLinksService,
  ],
  exports: [AccessVerifyService, AccessOid4VpService],
})
export class AccessModule {}
