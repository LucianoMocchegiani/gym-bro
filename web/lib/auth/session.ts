import type { StaffLoginResponse } from '@/lib/api/types';

const STORAGE_KEY = 'gymbro.staff.session';

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

/**
 * Lee la sesión Staff del storage del browser.
 */
export function readStaffSession(): StaffSession | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
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
  const next = { ...current, accessToken, refreshToken };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

/**
 * Cierra sesión Staff en el browser.
 */
export function clearStaffSession(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}
