/**
 * Tenants API (Super + resolución pública por slug).
 */

import type { CounterChargeOptions } from '@/lib/api/cash-discount';
import { apiRequest } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';
import type { MpCartCheckoutResult } from '@/lib/api/mercadopago';
import type { CashCartResult } from '@/lib/api/reservations';

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
 * Resumen de tenant para el dashboard de plataforma (slug `admin`).
 *
 * @remarks Espeja `PlatformTenantSummary` del API (`api/src/tenants/tenants.types.ts`).
 * No expone plan ni suscripción: no hay modelo `Subscription` todavía.
 */
export type PlatformTenantSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
  memberCount: number;
};

export type PlatformDashboardKpis = {
  activeGyms: number;
  withoutActiveTenantContract: number;
};

/** Ítem de carrito en venta de plataforma (solo packs). */
export type PlatformCartItem = {
  kind: 'PACK';
  id: string;
  quantity?: number;
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
 * Lista todos los tenants (plataforma), paginado.
 *
 * @remarks Staff del tenant `admin` (`PlatformTenantGuard`).
 */
export function listTenants(
  input?: ListParams,
): Promise<ListResult<TenantDetail>> {
  const qs = toSearchParams(input);
  return apiRequest<ListResult<TenantDetail>>(`/tenants${qs ? `?${qs}` : ''}`);
}

/** Detalle de tenant (plataforma). */
export function getTenant(id: string): Promise<TenantDetail> {
  return apiRequest<TenantDetail>(`/tenants/${id}`);
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
  });
}

/**
 * Eliminación de tenant (cascada total). Requiere `ELIMINAR` + slug.
 */
export function deleteTenant(
  id: string,
  confirmWord: string,
  slug: string,
): Promise<{ deleted: true }> {
  return apiRequest<{ deleted: true }>(`/tenants/${id}`, {
    method: 'DELETE',
    body: { confirmWord, slug },
  });
}

/**
 * Lista tenants para el dashboard de plataforma (staff del tenant `admin`).
 */
export function listPlatformTenants(
  input?: ListParams & { status?: TenantStatus },
): Promise<ListResult<PlatformTenantSummary>> {
  const qs = toSearchParams(input);
  return apiRequest<ListResult<PlatformTenantSummary>>(
    `/tenants/platform${qs ? `?${qs}` : ''}`,
  );
}

/**
 * KPIs del inicio de plataforma (gyms, no el tenant `admin`).
 */
export function getPlatformDashboardKpis(): Promise<PlatformDashboardKpis> {
  return apiRequest<PlatformDashboardKpis>('/tenants/platform/kpis');
}

/**
 * Cobro presencial de plataforma (efectivo o transferencia): el tenant `admin`
 * le factura un pack propio a `billingTenantId` (el gym pagador).
 *
 * @remarks Solo packs; el drop-in es por sesiones de un gym.
 */
export function startPlatformCashCart(
  billingTenantId: string,
  items: PlatformCartItem[],
  idempotencyKey: string,
  applyTrial?: boolean,
  charge?: CounterChargeOptions,
): Promise<CashCartResult> {
  return apiRequest<CashCartResult>(
    `/tenants/${billingTenantId}/transaction-items/cash/cart`,
    {
      method: 'POST',
      body: {
        items,
        idempotencyKey,
        applyTrial: applyTrial === true,
        ...charge,
      },
    },
  );
}

/**
 * Checkout MP de plataforma: el tenant `admin` le factura un pack propio a
 * `billingTenantId` (el gym pagador).
 */
export function startPlatformMpCartCheckout(
  billingTenantId: string,
  input: { items: PlatformCartItem[]; idempotencyKey?: string },
): Promise<MpCartCheckoutResult> {
  return apiRequest<MpCartCheckoutResult>(
    `/tenants/${billingTenantId}/transaction-items/mp/cart`,
    { method: 'POST', body: input },
  );
}
