import type { StaffLoginResponse } from '@/lib/api/auth';

const STORAGE_KEY = 'gymbro.identity.session';
const SESSION_EVENT = 'gymbro-identity-session';

export type IdentitySession = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  name: string | null;
  hasPassword: boolean;
};

let cachedRaw: string | null | undefined;
let cachedSession: IdentitySession | null = null;

function notify(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function subscribeIdentitySession(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  window.addEventListener(SESSION_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(SESSION_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

function parse(raw: string): IdentitySession | null {
  try {
    const parsed = JSON.parse(raw) as IdentitySession;
    if (!parsed.accessToken) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function readIdentitySession(): IdentitySession | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) {
    return cachedSession;
  }
  cachedRaw = raw;
  cachedSession = raw ? parse(raw) : null;
  return cachedSession;
}

export function getIdentitySessionServerSnapshot(): null {
  return null;
}

function persist(session: IdentitySession | null): void {
  if (session) {
    const raw = JSON.stringify(session);
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedSession = session;
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
    cachedRaw = null;
    cachedSession = null;
  }
  notify();
}

export function writeIdentitySession(
  login: StaffLoginResponse,
): IdentitySession {
  const session: IdentitySession = {
    accessToken: login.accessToken,
    refreshToken: login.refreshToken,
    userId: login.user.id,
    email: login.user.email,
    name: login.user.name,
    hasPassword: login.hasPassword,
  };
  persist(session);
  return session;
}

export function updateIdentityTokens(
  accessToken: string,
  refreshToken: string,
): IdentitySession | null {
  const current = readIdentitySession();
  if (!current) {
    return null;
  }
  const next = { ...current, accessToken, refreshToken };
  persist(next);
  return next;
}

export function clearIdentitySession(): void {
  if (typeof window === 'undefined') {
    return;
  }
  persist(null);
}
