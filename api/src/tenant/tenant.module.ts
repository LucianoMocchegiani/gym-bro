import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PlatformPlansModule } from '../platform-plans/platform-plans.module';
import { PlatformAccessService } from './platform-access.service';
import { PlatformAccessGuard } from './guards/platform-access.guard';
import { PlatformModuleGuard } from './guards/platform-module.guard';
import { TenantGuard } from './guards/tenant.guard';

/**
 * Aislamiento multi-tenant a nivel request (RN-TEN-001).
 *
 * @remarks Exporta {@link TenantGuard} y el recorte de plan Faciliter.
 */
@Global()
@Module({
  imports: [PlatformPlansModule],
  providers: [
    TenantGuard,
    PlatformAccessService,
    PlatformAccessGuard,
    PlatformModuleGuard,
    { provide: APP_GUARD, useExisting: PlatformModuleGuard },
  ],
  exports: [TenantGuard, PlatformAccessService, PlatformAccessGuard],
})
export class TenantModule {}
