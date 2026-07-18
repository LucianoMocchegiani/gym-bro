import { Global, Module } from '@nestjs/common';
import { TenantGuard } from './guards/tenant.guard';

/**
 * Aislamiento multi-tenant a nivel request (RN-TEN-001).
 *
 * @remarks Exporta {@link TenantGuard} para rutas de negocio.
 * Estado suspendido del gym: login/refresh (no cada request).
 */
@Global()
@Module({
  providers: [TenantGuard],
  exports: [TenantGuard],
})
export class TenantModule {}
