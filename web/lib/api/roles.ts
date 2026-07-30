/**
 * Roles API (módulo `roles`).
 */

import { apiRequest } from '@/lib/api/client';

export type RoleDetail = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  isSystem: boolean;
  permissionCodes: string[];
  createdAt: string;
  updatedAt: string;
};

export type CreateRoleInput = {
  name: string;
  permissionCodes: string[];
};

export type UpdateRoleInput = {
  name?: string;
  permissionCodes?: string[];
};

/**
 * Lista roles del tenant (`roles.write`).
 */
export function listRoles(): Promise<RoleDetail[]> {
  return apiRequest<RoleDetail[]>('/roles');
}

/**
 * Detalle de rol.
 */
export function getRole(roleId: string): Promise<RoleDetail> {
  return apiRequest<RoleDetail>(`/roles/${roleId}`);
}

/**
 * Alta de rol custom (CU-ROL-003).
 */
export function createRole(input: CreateRoleInput): Promise<RoleDetail> {
  return apiRequest<RoleDetail>('/roles', {
    method: 'POST',
    body: input,
  });
}

/**
 * Edición de Profesor o custom (Admin sistema → 403).
 */
export function updateRole(
  roleId: string,
  input: UpdateRoleInput,
): Promise<RoleDetail> {
  return apiRequest<RoleDetail>(`/roles/${roleId}`, {
    method: 'PATCH',
    body: input,
  });
}
