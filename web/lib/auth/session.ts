import type { StaffLoginResponse } from '@/lib/api/auth';
import { createTokenStore } from '@/lib/auth/token-store';

/**
 * Sesión Staff persistida en localStorage (panel puerta / Admin).
 */
export type StaffSession = {
  accessToken: string;
  refreshToken: string;
  tenantId: string | null;
  tenantSlug: string | null;
  userId: string;
  email: string;
  name: string | null;
  hasPassword: boolean;
  permissionCodes?: string[] | null;
  impersonating?: boolean;
  /** Recorte de plan Faciliter (`GET /auth/me`). */
  platformAccess?: 'ok' | 'limited';
};

const store = createTokenStore<StaffSession>({
  storageKey: 'gymbro.staff.session',
  eventName: 'gymbro-staff-session',
  normalize: (parsed) => ({ ...parsed, tenantSlug: parsed.tenantSlug ?? null }),
});

/** Suscripción para `useSyncExternalStore` (cambios de sesión Staff). */
export const subscribeStaffSession = store.subscribe;
/** Lee la sesión Staff del storage del browser. */
export const readStaffSession = store.read;
export const getStaffSessionServerSnapshot = store.serverSnapshot;
/** Cierra sesión Staff en el browser. */
export const clearStaffSession = store.clear;

/**
 * Persiste tokens y datos de usuario tras login Staff.
 *
 * @param tenantSlug Slug usado en el login (Host / form); se guarda para la marca UI.
 * @param impersonating Si es true, la sesión nació de impersonación de plataforma.
 */
export function writeStaffSession(
  login: StaffLoginResponse,
  tenantSlug?: string | null,
  impersonating = false,
): StaffSession {
  const tenantId = login.user.tenantId ?? null;
  if (!tenantId && login.profileType === 'STAFF') {
    throw new Error('Se requiere login Staff con tenantId');
  }
  return store.write({
    accessToken: login.accessToken,
    refreshToken: login.refreshToken,
    tenantId,
    tenantSlug: tenantSlug?.trim().toLowerCase() || null,
    userId: login.user.id,
    email: login.user.email,
    name: login.user.name,
    hasPassword: login.hasPassword,
    permissionCodes: null,
    impersonating,
    platformAccess: undefined,
  });
}

/** Actualiza el recorte de plan Faciliter (tras `GET /auth/me`). */
export function updateStaffPlatformAccess(
  platformAccess: 'ok' | 'limited',
): StaffSession | null {
  return store.update({ platformAccess });
}

/** Guarda permisos efectivos del staff (nav gated). */
export function updateStaffPermissions(
  permissionCodes: string[],
): StaffSession | null {
  return store.update({ permissionCodes });
}

/** Actualiza solo los tokens (tras refresh). */
export function updateStaffTokens(
  accessToken: string,
  refreshToken: string,
): StaffSession | null {
  return store.update({ accessToken, refreshToken });
}
