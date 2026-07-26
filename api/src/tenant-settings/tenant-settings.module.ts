import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { SuperTenantSettingsController } from './super-tenant-settings.controller';
import { TenantSettingsController } from './tenant-settings.controller';
import { TenantSettingsService } from './tenant-settings.service';

/**
 * Settings operativos del gym (horas de cancelación, etc.).
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule],
  controllers: [TenantSettingsController, SuperTenantSettingsController],
  providers: [TenantSettingsService],
  exports: [TenantSettingsService],
})
export class TenantSettingsModule {}
