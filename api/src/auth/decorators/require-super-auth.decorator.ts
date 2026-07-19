import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SuperGuard } from '../guards/super.guard';

/**
 * Auth JWT + perfil SUPER obligatorio.
 *
 * @remarks Usar en rutas de plataforma (CRUD tenants, etc.). Staff/Member → 403.
 */
export function RequireSuperAuth() {
  return applyDecorators(UseGuards(JwtAuthGuard, SuperGuard));
}
