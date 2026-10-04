import type { StaffLoginResponse } from '@/lib/api/auth';
import { createTokenStore } from '@/lib/auth/token-store';

/**
 * Sesión de socio en la web del gym (`{slug}/portal`, `{slug}/comprar`).
 */
export type MemberSession = {
  accessToken: string;
  refreshToken: string;
  tenantId: string;
  tenantSlug: string;
  memberId: string;
  email: string;
  name: string | null;
};

const store = createTokenStore<MemberSession>({
  storageKey: 'gymbro.member.session',
  eventName: 'gymbro-member-session',
});

export const subscribeMemberSession = store.subscribe;
export const readMemberSession = store.read;
export const getMemberSessionServerSnapshot = store.serverSnapshot;
export const clearMemberSession = store.clear;

export function writeMemberSession(
  login: StaffLoginResponse,
  tenantSlug: string,
): MemberSession {
  if (login.profileType !== 'MEMBER' || !login.user.tenantId) {
    throw new Error('Se requiere login de socio con tenantId');
  }
  return store.write({
    accessToken: login.accessToken,
    refreshToken: login.refreshToken,
    tenantId: login.user.tenantId,
    tenantSlug: tenantSlug.trim().toLowerCase(),
    memberId: login.user.id,
    email: login.user.email,
    name: login.user.name,
  });
}

export function updateMemberTokens(
  accessToken: string,
  refreshToken: string,
): MemberSession | null {
  return store.update({ accessToken, refreshToken });
}
