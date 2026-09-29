import { Global, Module } from '@nestjs/common';
import { PlatformAccessService } from './platform-access.service';
import { PlatformAccessGuard } from './guards/platform-access.guard';
import { TenantGuard } from './guards/tenant.guard';

/**
 * Aislamiento multi-tenant a nivel request (RN-TEN-001).
 *
 * @remarks Exporta {@link TenantGuard} y el recorte de plan Faciliter.
 */
@Global()
@Module({
  providers: [TenantGuard, PlatformAccessService, PlatformAccessGuard],
  exports: [TenantGuard, PlatformAccessService, PlatformAccessGuard],
})
export class TenantModule {}
