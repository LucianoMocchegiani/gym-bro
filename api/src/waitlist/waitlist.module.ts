import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { TenantSettingsModule } from '../tenant-settings/tenant-settings.module';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';

/**
 * Lista de espera de sesiones (E4 / CU-RES-004..005).
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule, TenantSettingsModule],
  controllers: [WaitlistController],
  providers: [WaitlistService],
  exports: [WaitlistService],
})
export class WaitlistModule {}
