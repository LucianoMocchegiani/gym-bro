/**
 * Sesión Super Admin (localStorage aparte del Staff).
 */

export type SuperSession = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  name: string | null;
};

export type SuperLoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  profileType: 'SUPER';
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};

const STORAGE_KEY = 'gymbro.super.session';
const SESSION_EVENT = 'gymbro-super-session';

let cachedRaw: string | null | undefined;
let cachedSession: SuperSession | null = null;

function notify(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

/**
 * Suscripción para `useSyncExternalStore` (sesión Super).
 */
export function subscribeSuperSession(onStoreChange: () => void): () => void {
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

function parseSession(raw: string): SuperSession | null {
  try {
    const parsed = JSON.parse(raw) as SuperSession;
    if (!parsed.accessToken || !parsed.email) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Lee sesión Super del storage.
 */
export function readSuperSession(): SuperSession | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) {
    return cachedSession;
  }
  cachedRaw = raw;
  cachedSession = raw ? parseSession(raw) : null;
  return cachedSession;
}

/**
 * Snapshot SSR: sin sesión.
 */
export function getSuperSessionServerSnapshot(): null {
  return null;
}

/**
 * Persiste sesión Super tras login.
 */
export function writeSuperSession(res: SuperLoginResponse): void {
  const session: SuperSession = {
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
    userId: res.user.id,
    email: res.user.email,
    name: res.user.name,
  };
  const raw = JSON.stringify(session);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedSession = session;
  notify();
}

/**
 * Actualiza tokens tras refresh.
 */
export function updateSuperTokens(
  accessToken: string,
  refreshToken: string,
): void {
  const current = readSuperSession();
  if (!current) {
    return;
  }
  writeSuperSession({
    accessToken,
    refreshToken,
    expiresIn: 0,
    tokenType: 'Bearer',
    profileType: 'SUPER',
    user: {
      id: current.userId,
      email: current.email,
      name: current.name,
    },
  });
}

/**
 * Borra sesión Super.
 */
export function clearSuperSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  cachedRaw = null;
  cachedSession = null;
  notify();
}
