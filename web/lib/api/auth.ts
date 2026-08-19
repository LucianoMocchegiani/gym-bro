/**
 * Auth API (módulo `auth`).
 */

import { apiRequest } from '@/lib/api/client';
import type { SuperLoginResponse } from '@/lib/auth/super-session';

export type StaffLoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  profileType: 'STAFF' | 'SUPER' | 'MEMBER';
  user: {
    id: string;
    email: string;
    name: string | null;
    tenantId?: string;
  };
};

/**
 * Login Staff por `tenantSlug` (preferido) o `tenantId` (compat).
 */
export function staffLogin(input: {
  tenantSlug?: string;
  tenantId?: string;
  email: string;
  password: string;
}): Promise<StaffLoginResponse> {
  return apiRequest<StaffLoginResponse>('/auth/staff/login', {
    method: 'POST',
    body: input,
    auth: false,
  });
}

/**
 * Login Super Admin (sin tenant).
 */
export function superLogin(input: {
  email: string;
  password: string;
}): Promise<SuperLoginResponse> {
  return apiRequest<SuperLoginResponse>('/auth/super/login', {
    method: 'POST',
    body: input,
    auth: false,
  });
}

/**
 * Logout: revoca refresh token si hay sesión.
 */
export async function staffLogout(refreshToken: string): Promise<void> {
  try {
    await apiRequest<void>('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    });
  } catch {
    // Cierre local igual si el server ya invalidó el token.
  }
}

/**
 * Logout Super (mismo endpoint de revocación).
 */
export async function superLogout(refreshToken: string): Promise<void> {
  return staffLogout(refreshToken);
}

/**
 * Cambia la contraseña del usuario autenticado.
 *
 * @remarks Revoca refresh tokens → obliga a re-login. Usar `auth: 'super'`
 * desde el contexto super admin.
 */
export function changePassword(
  input: { currentPassword: string; newPassword: string },
  auth: 'staff' | 'super' = 'staff',
): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>('/auth/change-password', {
    method: 'POST',
    body: input,
    auth,
  });
}
