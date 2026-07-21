import { BadRequestException } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { AuditActor } from './audit.types';

/**
 * Convierte el usuario autenticado en actor de auditoría.
 *
 * @throws {BadRequestException} Si el perfil no es SUPER ni STAFF.
 */
export function toAuditActor(user: AuthUser): AuditActor {
  if (user.profileType !== 'SUPER' && user.profileType !== 'STAFF') {
    throw new BadRequestException('Audit actor must be SUPER or STAFF');
  }
  return {
    profileType: user.profileType,
    userId: user.userId,
  };
}
