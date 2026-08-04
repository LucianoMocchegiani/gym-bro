/**
 * Roles API (módulo `roles`).
 */

import { apiRequest } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';

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
 * Lista roles del tenant (`roles.write`), paginado.
 */
export function listRoles(
  input?: ListParams,
): Promise<ListResult<RoleDetail>> {
  const qs = toSearchParams(input);
  return apiRequest<ListResult<RoleDetail>>(`/roles${qs ? `?${qs}` : ''}`);
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
