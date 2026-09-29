/**
 * Auth API (módulo `auth`).
 */

import { apiRequest } from '@/lib/api/client';

export type PlatformAccessState = 'ok' | 'limited';

export type StaffLoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  profileType: 'STAFF' | 'MEMBER' | 'IDENTITY';
  hasPassword: boolean;
  user: {
    id: string;
    email: string;
    name: string | null;
    tenantId?: string;
  };
};

/**
 * Login Staff por `tenantSlug` (preferido) o `tenantId` (compat).
 *
 * @remarks La plataforma entra con `tenantSlug: 'admin'`.
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
 * Staff de un tenant entra con `id_token` de Google (Admin web).
 */
export function staffGoogleLogin(input: {
  tenantId: string;
  idToken: string;
}): Promise<StaffLoginResponse> {
  return apiRequest<StaffLoginResponse>(
    `/auth/staff/${input.tenantId}/google`,
    {
      method: 'POST',
      body: { idToken: input.idToken },
      auth: false,
    },
  );
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
 * Smoke de sesión (`GET /auth/me`). 401 limpia tokens en el cliente HTTP.
 */
export type AuthMeResponse = {
  userId: string;
  email: string;
  profileType: 'STAFF' | 'MEMBER' | 'IDENTITY';
  tenantId?: string;
  impersonatedBy?: string;
  platformAccess: PlatformAccessState;
};

export function fetchAuthMe(): Promise<AuthMeResponse> {
  return apiRequest<AuthMeResponse>('/auth/me');
}

export function identityLogin(input: {
  email: string;
  password: string;
}): Promise<StaffLoginResponse> {
  return apiRequest<StaffLoginResponse>('/auth/identity/login', {
    method: 'POST',
    body: input,
    auth: false,
  });
}

export function identityRegister(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<StaffLoginResponse> {
  return apiRequest<StaffLoginResponse>('/auth/identity/register', {
    method: 'POST',
    body: input,
    auth: false,
  });
}

/**
 * Intercambia cookie central de login proxy por JWT.
 */
export function fromCookie(tenantSlug?: string): Promise<StaffLoginResponse> {
  return apiRequest<StaffLoginResponse>('/auth/from-cookie', {
    method: 'POST',
    body: tenantSlug ? { tenantSlug } : {},
    auth: false,
  });
}

/**
 * Canjea cookie de impersonación por JWT del staff destino.
 */
export function fromHandoff(): Promise<StaffLoginResponse> {
  return apiRequest<StaffLoginResponse>('/auth/from-handoff', {
    method: 'POST',
    body: {},
    auth: false,
  });
}

/**
 * Cambia la contraseña del usuario autenticado.
 *
 * @remarks Revoca refresh tokens → obliga a re-login.
 */
export function changePassword(
  input: {
    currentPassword: string;
    newPassword: string;
  },
  auth: 'staff' | 'identity' = 'staff',
): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>('/auth/change-password', {
    method: 'POST',
    body: input,
    auth,
  });
}

/**
 * Empieza impersonación: cookie de handoff en el API, sin JWT en el body.
 */
export function impersonateStaff(
  tenantId: string,
  staffUserId: string,
): Promise<{ tenantSlug: string }> {
  return apiRequest<{ tenantSlug: string }>('/auth/super/impersonate', {
    method: 'POST',
    body: { tenantId, staffUserId },
  });
}
