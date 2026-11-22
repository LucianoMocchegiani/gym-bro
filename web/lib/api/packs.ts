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
  imageUrl: string | null;
  price: number;
  billingPeriod: 'MONTHLY' | 'ONE_TIME';
  creditsExpireAt: string | null;
  active: boolean;
  /** Solo packs de plataforma: la Caja puede dar el mes de prueba. */
  offersPlatformTrial: boolean;
  kind: PackKind;
  components: PackComponentDetail[];
  kuatiaConfigurationId: string | null;
  kuatiaVct: string | null;
  kuatiaSyncedAt: string | null;
  kuatiaLastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PackSummary = Pick<
  PackDetail,
  | 'id'
  | 'name'
  | 'price'
  | 'active'
  | 'kind'
  | 'billingPeriod'
  | 'offersPlatformTrial'
>;

export type PackComponentInput = {
  serviceId: string;
  creditAmount?: number;
};

export type CreatePackInput = {
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  billingPeriod: 'MONTHLY' | 'ONE_TIME';
  creditsExpireAt?: string;
  active?: boolean;
  components: PackComponentInput[];
};

export type UpdatePackInput = {
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number;
  billingPeriod?: 'MONTHLY' | 'ONE_TIME';
  creditsExpireAt?: string | null;
  active?: boolean;
  components?: PackComponentInput[];
};

export type ListPacksInput = { active?: boolean } & ListParams;

export function listPacks(
  input?: ListPacksInput,
): Promise<ListResult<PackDetail>> {
  const qs = toSearchParams(input);
  return apiRequest<ListResult<PackDetail>>(`/packs${qs ? `?${qs}` : ''}`);
}

export function listActivePacks(
  input?: ListParams,
): Promise<ListResult<PackSummary>> {
  return listPacks({ active: true, pageSize: 100, ...input });
}

export function getPack(packId: string): Promise<PackDetail> {
  return apiRequest<PackDetail>(`/packs/${packId}`);
}

export function createPack(input: CreatePackInput): Promise<PackDetail> {
  return apiRequest<PackDetail>('/packs', {
    method: 'POST',
    body: input,
  });
}

export function updatePack(
  packId: string,
  input: UpdatePackInput,
): Promise<PackDetail> {
  return apiRequest<PackDetail>(`/packs/${packId}`, {
    method: 'PATCH',
    body: input,
  });
}

export function getPackLandingVisibility(
  packId: string,
): Promise<{ showOnLanding: boolean }> {
  return apiRequest(`/packs/${packId}/landing-visibility`);
}

export function updatePackLandingVisibility(
  packId: string,
  showOnLanding: boolean,
): Promise<{ showOnLanding: boolean }> {
  return apiRequest(`/packs/${packId}/landing-visibility`, {
    method: 'PATCH',
    body: { showOnLanding },
  });
}

export type DeletePackResult = {
  deleted?: boolean;
  deactivated?: boolean;
  activeContracts?: number;
  totalContracts?: number;
};

export function deletePack(
  packId: string,
  confirmDeactivate = false,
): Promise<DeletePackResult> {
  const qs = confirmDeactivate ? '?confirm=deactivate' : '';
  return apiRequest<DeletePackResult>(`/packs/${packId}${qs}`, {
    method: 'DELETE',
  });
}
