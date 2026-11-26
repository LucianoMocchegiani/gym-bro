import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformAccessGuard } from '../guards/platform-access.guard';
import { TenantGuard } from '../guards/tenant.guard';

/**
 * Auth JWT + tenant obligatorio (staff/afiliado).
 *
 * @remarks Staff sin plan Faciliter vigente (gracia 3 días) queda limitado:
 * el {@link PlatformAccessGuard} recorta operación. MEMBER no se recorta.
 */
export function RequireTenantAuth() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, TenantGuard, PlatformAccessGuard),
  );
}
