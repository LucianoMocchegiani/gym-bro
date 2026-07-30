/**
 * Staff API (módulo `staff`).
 */

import { apiRequest } from '@/lib/api/client';

export type StaffRoleSummary = {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
};

export type StaffUserDetail = {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  active: boolean;
  roles: StaffRoleSummary[];
  createdAt: string;
  updatedAt: string;
};

export type CreateStaffInput = {
  email: string;
  password: string;
  name?: string;
  roleIds?: string[];
};

/**
 * Lista staff del tenant (`staff.read`).
 */
export function listStaff(): Promise<StaffUserDetail[]> {
  return apiRequest<StaffUserDetail[]>('/staff');
}

/**
 * Detalle de staff.
 */
export function getStaff(staffId: string): Promise<StaffUserDetail> {
  return apiRequest<StaffUserDetail>(`/staff/${staffId}`);
}

/**
 * Alta de staff (`staff.write`).
 */
export function createStaff(
  input: CreateStaffInput,
): Promise<StaffUserDetail> {
  return apiRequest<StaffUserDetail>('/staff', {
    method: 'POST',
    body: input,
  });
}

/**
 * Reemplaza roles del staff (CU-ROL-004).
 */
export function setStaffRoles(
  staffId: string,
  roleIds: string[],
): Promise<StaffUserDetail> {
  return apiRequest<StaffUserDetail>(`/staff/${staffId}/roles`, {
    method: 'PUT',
    body: { roleIds },
  });
}
