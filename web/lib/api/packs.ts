/**
 * Packs API (módulo `packs`).
 */

import { apiRequest } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';

export type PackKind = 'ACCESS' | 'CREDITS' | 'MIXED';

export type PackComponentDetail = {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceType: 'ACCESO_LIBRE' | 'POR_SESIONES';
  creditAmount: number | null;
};

export type PackDetail = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  price: number;
  billingPeriod: 'MONTHLY' | 'ONE_TIME';
  creditsExpireAt: string | null;
  active: boolean;
  kind: PackKind;
  components: PackComponentDetail[];
  /** Clave OID4VCI (`pack_{id}`); null si aún no se intentó sync. */
  kuatiaConfigurationId: string | null;
  kuatiaVct: string | null;
  kuatiaSyncedAt: string | null;
  kuatiaLastError: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Alias para selects de cobro. */
export type PackSummary = Pick<
  PackDetail,
  'id' | 'name' | 'price' | 'active' | 'kind'
>;

export type PackComponentInput = {
  serviceId: string;
  creditAmount?: number;
};

export type CreatePackInput = {
  name: string;
  description?: string;
  price: number;
  billingPeriod: 'MONTHLY' | 'ONE_TIME';
  creditsExpireAt?: string;
  active?: boolean;
  components: PackComponentInput[];
};

export type UpdatePackInput = {
  name?: string;
  description?: string | null;
  price?: number;
  billingPeriod?: 'MONTHLY' | 'ONE_TIME';
  creditsExpireAt?: string | null;
  active?: boolean;
  components?: PackComponentInput[];
};

export type ListPacksInput = { active?: boolean } & ListParams;

/**
 * Lista packs (`catalog.write`), paginado.
 */
export function listPacks(
  input?: ListPacksInput,
): Promise<ListResult<PackDetail>> {
  const qs = toSearchParams(input);
  return apiRequest<ListResult<PackDetail>>(`/packs${qs ? `?${qs}` : ''}`);
}

/**
 * Packs activos (cobro / selects); trae hasta 100 por defecto.
 */
export function listActivePacks(
  input?: ListParams,
): Promise<ListResult<PackSummary>> {
  return listPacks({ active: true, pageSize: 100, ...input });
}

/**
 * Detalle de pack.
 */
export function getPack(packId: string): Promise<PackDetail> {
  return apiRequest<PackDetail>(`/packs/${packId}`);
}

/**
 * Alta de pack (CU-SER-002).
 */
export function createPack(input: CreatePackInput): Promise<PackDetail> {
  return apiRequest<PackDetail>('/packs', {
    method: 'POST',
    body: input,
  });
}

/**
 * Edición de pack (components reemplaza el set completo).
 */
export function updatePack(
  packId: string,
  input: UpdatePackInput,
): Promise<PackDetail> {
  return apiRequest<PackDetail>(`/packs/${packId}`, {
    method: 'PATCH',
    body: input,
  });
}
