/**
 * Staff API (módulo `staff` + offers Kuatia).
 */

import { apiRequest } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';

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
  imageUrl: string | null;
  active: boolean;
  roles: StaffRoleSummary[];
  createdAt: string;
  updatedAt: string;
};

export type CreateStaffInput = {
  email: string;
  password: string;
  name?: string;
  imageUrl?: string;
  roleIds?: string[];
};

export type StaffCredentialOfferStatus = 'PENDING' | 'FAILED' | 'ACCEPTED';

export type StaffCredentialOfferItem = {
  id: string;
  status: StaffCredentialOfferStatus;
  staffUserId: string;
  staffName: string | null;
  staffEmail: string;
  offerUri: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Lista staff del tenant (`staff.read`), paginado.
 */
export function listStaff(
  input?: ListParams,
): Promise<ListResult<StaffUserDetail>> {
  const qs = toSearchParams(input);
  return apiRequest<ListResult<StaffUserDetail>>(`/staff${qs ? `?${qs}` : ''}`);
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

/**
 * Lista offers de credencial de acceso staff (`staff.read`).
 */
export function listStaffCredentialOffers(
  staffId: string,
  input?: ListParams,
): Promise<ListResult<StaffCredentialOfferItem>> {
  const qs = toSearchParams(input);
  return apiRequest<ListResult<StaffCredentialOfferItem>>(
    `/staff/${staffId}/credential-offers${qs ? `?${qs}` : ''}`,
  );
}

/**
 * Emite / re-emite offer OID4VCI de acceso staff (`staff.write`).
 */
export function issueStaffCredentialOffer(
  staffId: string,
  force = true,
): Promise<StaffCredentialOfferItem> {
  return apiRequest<StaffCredentialOfferItem>(
    `/staff/${staffId}/credential-offers`,
    {
      method: 'POST',
      body: { force },
    },
  );
}

/**
 * Eliminación segura de staff (`staff.write`).
 *
 * @remarks 409 `STAFF_HAS_ACTIVITY` si tiene actividad registrada.
 */
export function deleteStaff(staffId: string): Promise<{ deleted: true }> {
  return apiRequest<{ deleted: true }>(`/staff/${staffId}`, {
    method: 'DELETE',
  });
}

/**
 * Lista staff de un tenant (Super Admin).
 */
export function listStaffByTenant(
  tenantId: string,
  input?: ListParams,
): Promise<ListResult<StaffUserDetail>> {
  const qs = toSearchParams(input);
  return apiRequest<ListResult<StaffUserDetail>>(
    `/tenants/${tenantId}/staff${qs ? `?${qs}` : ''}`,
    { auth: 'super' },
  );
}
