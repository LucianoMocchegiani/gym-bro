import { apiRequest } from '@/lib/api/client';
import type { StaffLoginResponse } from '@/lib/api/types';

/**
 * Login Staff (CU-ROL / auth).
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
