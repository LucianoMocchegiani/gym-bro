import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformAccessGuard } from '../guards/platform-access.guard';
import { PlatformModuleGuard } from '../guards/platform-module.guard';
import { TenantGuard } from '../guards/tenant.guard';

/**
 * Auth JWT + tenant obligatorio (staff/afiliado), con los controles de plan.
 */
export function RequireTenantAuth() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, TenantGuard, PlatformAccessGuard, PlatformModuleGuard),
  );
}
