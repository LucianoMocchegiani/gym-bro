import type { StaffLoginResponse } from '@/lib/api/auth';
import { createTokenStore } from '@/lib/auth/token-store';

export type IdentitySession = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  name: string | null;
  hasPassword: boolean;
};

const store = createTokenStore<IdentitySession>({
  storageKey: 'gymbro.identity.session',
  eventName: 'gymbro-identity-session',
});

export const subscribeIdentitySession = store.subscribe;
export const readIdentitySession = store.read;
export const getIdentitySessionServerSnapshot = store.serverSnapshot;
export const clearIdentitySession = store.clear;

export function writeIdentitySession(
  login: StaffLoginResponse,
): IdentitySession {
  return store.write({
    accessToken: login.accessToken,
    refreshToken: login.refreshToken,
    userId: login.user.id,
    email: login.user.email,
    name: login.user.name,
    hasPassword: login.hasPassword,
  });
}

export function updateIdentityTokens(
  accessToken: string,
  refreshToken: string,
): IdentitySession | null {
  return store.update({ accessToken, refreshToken });
}
