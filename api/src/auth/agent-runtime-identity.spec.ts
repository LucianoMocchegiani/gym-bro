import { ForbiddenException } from '@nestjs/common';
import { toAgentRuntimeIdentity } from './agent-runtime-identity';
import type { AuthUser } from './auth.types';

describe('toAgentRuntimeIdentity', () => {
  const staff: AuthUser = {
    userId: 'user-1',
    email: 'staff@example.com',
    profileType: 'STAFF',
    tenantId: 'gym-1',
  };

  it('scopes conversations by tenant, role, and user', () => {
    expect(toAgentRuntimeIdentity(staff)).toEqual({
      userId: '["gym-1","STAFF","user-1"]',
      tenantId: 'gym-1',
      role: 'STAFF',
      profileType: 'STAFF',
      email: 'staff@example.com',
    });
    expect(toAgentRuntimeIdentity({ ...staff, tenantId: 'gym-2' }).userId).not.toBe(
      toAgentRuntimeIdentity(staff).userId,
    );
  });

  it('rejects identities without a staff tenant context', () => {
    expect(() => toAgentRuntimeIdentity({ ...staff, profileType: 'MEMBER' })).toThrow(
      ForbiddenException,
    );
    expect(() => toAgentRuntimeIdentity({ ...staff, tenantId: undefined })).toThrow(
      ForbiddenException,
    );
  });
});
