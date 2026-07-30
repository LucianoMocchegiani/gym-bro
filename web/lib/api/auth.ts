/**
 * Auth API (módulo `auth`).
 */

import { apiRequest } from '@/lib/api/client';

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
 * Login Staff.
 */
export function staffLogin(input: {
  tenantId: string;
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
