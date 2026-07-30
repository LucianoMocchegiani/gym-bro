import type { StaffLoginResponse } from '@/lib/api/auth';

const STORAGE_KEY = 'gymbro.staff.session';
const SESSION_EVENT = 'gymbro-staff-session';

/**
 * Sesión Staff persistida en localStorage (panel puerta / Admin).
 */
export type StaffSession = {
  accessToken: string;
  refreshToken: string;
  tenantId: string;
  userId: string;
  email: string;
  name: string | null;
};

/** Snapshot cacheado: misma referencia si el JSON no cambió (useSyncExternalStore). */
let cachedRaw: string | null | undefined;
let cachedSession: StaffSession | null = null;

function notifySessionListeners(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

/**
 * Suscripción para `useSyncExternalStore` (cambios de sesión Staff).
 */
export function subscribeStaffSession(onStoreChange: () => void): () => void {
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

function parseSession(raw: string): StaffSession | null {
  try {
    const parsed = JSON.parse(raw) as StaffSession;
    if (!parsed.accessToken || !parsed.tenantId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Lee la sesión Staff del storage del browser.
 *
 * @remarks Devuelve referencia estable mientras el valor en localStorage no cambie.
 */
export function readStaffSession(): StaffSession | null {
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
export function getStaffSessionServerSnapshot(): null {
  return null;
}

function persist(session: StaffSession | null): void {
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
  notifySessionListeners();
}

/**
 * Persiste tokens y datos de usuario tras login Staff.
 */
export function writeStaffSession(login: StaffLoginResponse): StaffSession {
  const tenantId = login.user.tenantId;
  if (!tenantId || login.profileType !== 'STAFF') {
    throw new Error('Se requiere login Staff con tenantId');
  }
  const session: StaffSession = {
    accessToken: login.accessToken,
    refreshToken: login.refreshToken,
    tenantId,
    userId: login.user.id,
    email: login.user.email,
    name: login.user.name,
  };
  persist(session);
  return session;
}

/**
 * Actualiza solo los tokens (tras refresh).
 */
export function updateStaffTokens(
  accessToken: string,
  refreshToken: string,
): StaffSession | null {
  const current = readStaffSession();
  if (!current) {
    return null;
  }
  const next: StaffSession = { ...current, accessToken, refreshToken };
  persist(next);
  return next;
}

/**
 * Cierra sesión Staff en el browser.
 */
export function clearStaffSession(): void {
  if (typeof window === 'undefined') {
    return;
  }
  persist(null);
}
