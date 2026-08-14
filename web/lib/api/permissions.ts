/**
 * Permisos del staff logueado (`GET /me/permissions`).
 */

import { apiRequest } from '@/lib/api/client';

export type MyPermissionsResponse = {
  permissionCodes: string[];
};

/**
 * Códigos efectivos (unión de roles) del staff actual.
 */
export function getMyPermissions(): Promise<MyPermissionsResponse> {
  return apiRequest<MyPermissionsResponse>('/me/permissions');
}
