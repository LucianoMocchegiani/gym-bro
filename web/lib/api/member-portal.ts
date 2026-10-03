/**
 * Web del gym para el socio: alta con pago previo, sesiones, carrito y cuenta.
 *
 * @remarks Mismos endpoints `/me/*` que la app (JWT de socio, `auth: 'member'`).
 */

import { apiRequest, newIdempotencyKey } from '@/lib/api/client';
import type { ListResult } from '@/lib/api/list';
import type { MemberAccountDetail } from '@/lib/api/members';
import type {
  MpCartCheckoutResult,
  MpCartItemInput,
} from '@/lib/api/mercadopago';
import type { StorePack } from '@/lib/api/public-tenant-catalog';
import type { ReceiptDetail } from '@/lib/api/receipts';
import type { RefundRequestDetail } from '@/lib/api/refunds';
import type { ReservationDetail } from '@/lib/api/reservations';
import type { WaitlistEntryDetail } from '@/lib/api/waitlist';

export type MemberSignupCheckout = {
  signupId: string;
  checkoutUrl: string | null;
  sandboxCheckoutUrl: string | null;
};

export type MemberSignupStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export type MemberSignupView = {
  id: string;
  tenantId: string;
  status: MemberSignupStatus;
};

/** Sesión publicada para el socio (`GET /me/sessions`). */
export type MemberSessionSlot = {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceImageUrl: string | null;
  branchName: string | null;
  instructorName: string | null;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  slotsLeft: number;
  hasSlots: boolean;
  /** Precio de la clase suelta; null si el servicio no la vende. */
  dropInPrice: number | null;
};

/**
 * Alta web (JWT Identity): guarda los datos y devuelve el link de Mercado
 * Pago. El socio nace recién con el pago aprobado; MP vuelve a `/cuenta?alta=`.
 */
export function startMemberSignup(input: {
  tenantSlug: string;
  packId: string;
  name: string;
  document: string;
  phone?: string;
}): Promise<MemberSignupCheckout> {
  return apiRequest<MemberSignupCheckout>('/identity/member-signups', {
    method: 'POST',
    body: input,
    auth: 'identity',
  });
}

export function getMemberSignup(id: string): Promise<MemberSignupView> {
  return apiRequest<MemberSignupView>(
    `/identity/member-signups/${encodeURIComponent(id)}`,
    { auth: 'identity' },
  );
}

export function listMyStorePacks(): Promise<StorePack[]> {
  return apiRequest<StorePack[]>('/me/packs', { auth: 'member' });
}

/** ¿El gym cobra online? Sin Mercado Pago no hay carrito. */
export async function getMyGymMpConnected(): Promise<boolean> {
  const status = await apiRequest<{ connected: boolean }>('/me/mp-status', {
    auth: 'member',
  });
  return status.connected;
}

/**
 * Checkout MP del carrito (packs y drop-ins, un solo pago). Al terminar MP
 * vuelve a `/cuenta?compra=`; el webhook aprobado crea contratos y reservas.
 */
export function startMyCartCheckout(
  items: MpCartItemInput[],
): Promise<MpCartCheckoutResult> {
  return apiRequest<MpCartCheckoutResult>('/me/transaction-items/mp/cart', {
    method: 'POST',
    body: {
      items,
      idempotencyKey: newIdempotencyKey('web-cart'),
      returnToWeb: true,
    },
    auth: 'member',
  });
}

/** Packs vigentes hoy, créditos y próximas reservas. */
export function getMyAccount(): Promise<MemberAccountDetail> {
  return apiRequest<MemberAccountDetail>('/me/account', { auth: 'member' });
}

/** Sesiones publicadas en `[from, to]`, todas las páginas (máx. 1000). */
export async function listMySessionsInRange(
  from: Date,
  to: Date,
): Promise<MemberSessionSlot[]> {
  const items: MemberSessionSlot[] = [];
  for (let page = 1; page <= 10; page++) {
    const qs = new URLSearchParams({
      page: String(page),
      pageSize: '100',
      from: from.toISOString(),
      to: to.toISOString(),
    });
    const result = await apiRequest<ListResult<MemberSessionSlot>>(
      `/me/sessions?${qs}`,
      { auth: 'member' },
    );
    items.push(...result.items);
    if (!result.hasMore) {
      break;
    }
  }
  return items;
}

/** Reserva con 1 crédito del servicio (CU-RES-001). */
export function reserveSession(sessionId: string): Promise<ReservationDetail> {
  return apiRequest<ReservationDetail>('/me/reservations', {
    method: 'POST',
    body: { sessionId },
    auth: 'member',
  });
}

/** Cancela una reserva propia, dentro de la ventana del gym (CU-RES-003). */
export function cancelMyReservation(
  reservationId: string,
): Promise<ReservationDetail> {
  return apiRequest<ReservationDetail>(
    `/me/reservations/${encodeURIComponent(reservationId)}/status`,
    { method: 'PATCH', body: { status: 'CANCELLED' }, auth: 'member' },
  );
}

/** Mis últimas 100 reservas, de la sesión más nueva a la más vieja. */
export async function listMyReservations(): Promise<ReservationDetail[]> {
  const result = await apiRequest<ListResult<ReservationDetail>>(
    '/me/reservations?pageSize=100&order=desc',
    { auth: 'member' },
  );
  return result.items;
}

/** Lista de espera de una sesión llena (CU-RES-004). */
export function joinWaitlist(sessionId: string): Promise<WaitlistEntryDetail> {
  return apiRequest<WaitlistEntryDetail>('/me/waitlist', {
    method: 'POST',
    body: { sessionId },
    auth: 'member',
  });
}

export function leaveMyWaitlist(entryId: string): Promise<WaitlistEntryDetail> {
  return apiRequest<WaitlistEntryDetail>(
    `/me/waitlist/${encodeURIComponent(entryId)}/status`,
    { method: 'PATCH', body: { status: 'LEFT' }, auth: 'member' },
  );
}

/** Mis lugares en espera (solo `WAITING`). */
export async function listMyWaitlist(): Promise<WaitlistEntryDetail[]> {
  const result = await apiRequest<ListResult<WaitlistEntryDetail>>(
    '/me/waitlist?pageSize=100&order=asc',
    { auth: 'member' },
  );
  return result.items;
}

/**
 * Comprobantes propios (packs, drop-ins, devoluciones; MP o efectivo), del más
 * nuevo al más viejo, con sus líneas (RN-PAG-009).
 */
export function listMyReceipts(
  page = 1,
): Promise<ListResult<ReceiptDetail>> {
  return apiRequest<ListResult<ReceiptDetail>>(
    `/me/receipts?page=${page}&pageSize=20&order=desc`,
    { auth: 'member' },
  );
}

/** Mis solicitudes de devolución (las últimas 100). */
export async function listMyRefundRequests(): Promise<RefundRequestDetail[]> {
  const result = await apiRequest<ListResult<RefundRequestDetail>>(
    '/me/refund-requests?pageSize=100',
    { auth: 'member' },
  );
  return result.items;
}

/** Pide la devolución de una línea cobrada (CU-PAG-004). */
export function requestMyRefund(
  transactionItemId: string,
  reason?: string,
): Promise<RefundRequestDetail> {
  return apiRequest<RefundRequestDetail>(
    `/me/transaction-items/${encodeURIComponent(transactionItemId)}/refund-requests`,
    {
      method: 'POST',
      body: reason ? { reason } : {},
      auth: 'member',
    },
  );
}
