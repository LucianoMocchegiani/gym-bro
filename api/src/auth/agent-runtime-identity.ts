import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from './auth.types';

/** Identity Runtime accepts as a single partition key, with GymBro's tenant and role encoded into it. */
export function toAgentRuntimeIdentity(user: AuthUser) {
  if (user.profileType !== 'STAFF' || !user.tenantId) {
    throw new ForbiddenException('Agent Runtime requires a staff tenant context');
  }

  return {
    userId: JSON.stringify([user.tenantId, user.profileType, user.userId]),
    tenantId: user.tenantId,
    role: user.profileType,
    profileType: user.profileType,
    email: user.email,
  };
}
