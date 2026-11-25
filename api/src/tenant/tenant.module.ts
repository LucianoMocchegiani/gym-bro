import { Global, Module } from '@nestjs/common';
import { PlatformPlansModule } from '../../platform-plans/platform-plans.module';
import { PlatformAccessService } from './platform-access.service';
import { PlatformAccessGuard } from './guards/platform-access.guard';
import { PlatformModuleGuard } from './guards/platform-module.guard';
import { TenantGuard } from './guards/tenant.guard';

/**
 * Aislamiento multi-tenant y autorización por plan Faciliter.
 */
@Global()
@Module({
  imports: [PlatformPlansModule],
  providers: [TenantGuard, PlatformAccessService, PlatformAccessGuard, PlatformModuleGuard],
  exports: [TenantGuard, PlatformAccessService, PlatformAccessGuard, PlatformModuleGuard],
})
export class TenantModule {}
