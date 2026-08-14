/**
 * Tenants API (Super + resolución pública por slug).
 */

import { apiRequest } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';

export type TenantStatus = 'ACTIVE' | 'SUSPENDED';

export type PublicTenantSummary = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
};

export type TenantDetail = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
  defaultBranch: {
    id: string;
    name: string;
    active: boolean;
    isDefault: boolean;
  } | null;
  owner: {
    id: string;
    email: string;
    name: string | null;
  } | null;
};

export type CreateTenantInput = {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerName?: string;
};

export type UpdateTenantInput = {
  name?: string;
  slug?: string;
  status?: TenantStatus;
};

/**
 * Resuelve gym por slug (público, sin auth).
 */
export function getTenantBySlug(slug: string): Promise<PublicTenantSummary> {
  return apiRequest<PublicTenantSummary>(
    `/public/tenants/by-slug/${encodeURIComponent(slug)}`,
    { auth: false },
  );
}

/**
 * Lista tenants (Super), paginado.
 */
export function listTenants(
  input?: ListParams,
): Promise<ListResult<TenantDetail>> {
  const qs = toSearchParams(input);
  return apiRequest<ListResult<TenantDetail>>(`/tenants${qs ? `?${qs}` : ''}`, {
    auth: 'super',
  });
}

/**
 * Detalle de tenant (Super).
 */
export function getTenant(id: string): Promise<TenantDetail> {
  return apiRequest<TenantDetail>(`/tenants/${id}`, { auth: 'super' });
}

/**
 * Alta de tenant + owner (CU-ROL-001).
 */
export function createTenant(
  input: CreateTenantInput,
): Promise<TenantDetail> {
  return apiRequest<TenantDetail>('/tenants', {
    method: 'POST',
    body: input,
    auth: 'super',
  });
}

/**
 * Edición / suspensión (CU-ROL-002).
 */
export function updateTenant(
  id: string,
  input: UpdateTenantInput,
): Promise<TenantDetail> {
  return apiRequest<TenantDetail>(`/tenants/${id}`, {
    method: 'PATCH',
    body: input,
    auth: 'super',
  });
}
