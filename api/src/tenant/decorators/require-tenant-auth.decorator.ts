import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';

/**
 * Auth JWT + tenant obligatorio (staff/afiliado).
 *
 * @remarks Usar en controllers de negocio del gym. Super queda fuera (403).
 */
export function RequireTenantAuth() {
  return applyDecorators(UseGuards(JwtAuthGuard, TenantGuard));
}
