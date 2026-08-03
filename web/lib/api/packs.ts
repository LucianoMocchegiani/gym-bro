/**
 * Packs API (módulo `packs`).
 */

import { apiRequest } from '@/lib/api/client';

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
  quarkConfigurationId: string | null;
  quarkVct: string | null;
  quarkSyncedAt: string | null;
  quarkLastError: string | null;
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

/**
 * Lista packs (`catalog.write`).
 */
export function listPacks(active?: boolean): Promise<PackDetail[]> {
  const q = active === undefined ? '' : `?active=${active}`;
  return apiRequest<PackDetail[]>(`/packs${q}`);
}

/**
 * Packs activos (cobro / selects).
 */
export function listActivePacks(): Promise<PackSummary[]> {
  return listPacks(true);
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
