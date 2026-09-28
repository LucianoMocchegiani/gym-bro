import { BadRequestException } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { AuditActor } from './audit.types';

/**
 * Convierte el usuario autenticado en actor de auditoría.
 *
 * @throws {BadRequestException} Si el perfil no es STAFF.
 */
export function toAuditActor(user: AuthUser): AuditActor {
  if (user.profileType !== 'STAFF') {
    throw new BadRequestException('Audit actor must be STAFF');
  }
  return {
    profileType: user.profileType,
    userId: user.userId,
  };
}
