import { applyDecorators, UseGuards } from '@nestjs/common';
import { IdentityGuard } from '../guards/identity.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/**
 * Access JWT de persona (picker). No sirve para Caja ni `/me` de gym.
 */
export function RequireIdentityAuth() {
  return applyDecorators(UseGuards(JwtAuthGuard, IdentityGuard));
}
