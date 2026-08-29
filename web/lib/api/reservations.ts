/**
 * Reservations API (módulo `reservations`).
 */

import { apiRequest, newIdempotencyKey } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';
import type { ReceiptDetail } from '@/lib/api/receipts';

export type ReservationStatus = 'CONFIRMED' | 'CANCELLED';
export type ReservationCoverage = 'CREDIT' | 'DROP_IN';

export type ReservationDetail = {
  id: string;
  tenantId: string;
  memberId: string;
  memberName: string | null;
  memberEmail: string;
  sessionId: string;
  sessionStartsAt: string;
  sessionEndsAt: string;
  serviceId: string;
  serviceName: string;
  contractId: string | null;
  creditBalanceId: string | null;
  transactionItemId: string | null;
  transactionItemAmount: number | null;
  transactionItemMethod: 'STUB' | 'CASH' | 'MP' | null;
  status: ReservationStatus;
  coverage: ReservationCoverage;
  createdAt: string;
  updatedAt: string;
};

export type ListSessionReservationsInput = {
  status?: ReservationStatus;
} & ListParams;

/**
 * Roster de una sesión (`reservations.write`).
 */
export function listSessionReservations(
  sessionId: string,
  input?: ListSessionReservationsInput,
): Promise<ListResult<ReservationDetail>> {
  const qs = toSearchParams(input);
  return apiRequest<ListResult<ReservationDetail>>(
    `/sessions/${sessionId}/reservations${qs ? `?${qs}` : ''}`,
  );
}

/**
 * Reserva con crédito en nombre del afiliado (staff).
 */
export function createCreditReservation(
  memberId: string,
  sessionId: string,
): Promise<ReservationDetail> {
  return apiRequest<ReservationDetail>(`/members/${memberId}/reservations`, {
    method: 'POST',
    body: {
      sessionId,
      coverage: 'CREDIT',
    },
  });
}

/**
 * Cancela reserva CONFIRMADA (staff; sin ventana de horas del gym).
 */
export function cancelReservation(
  reservationId: string,
): Promise<ReservationDetail> {
  return apiRequest<ReservationDetail>(
    `/reservations/${reservationId}/status`,
    {
      method: 'PATCH',
      body: { status: 'CANCELLED' },
    },
  );
}

export type CashCartItem = {
  kind: 'DROP_IN' | 'PACK';
  id: string;
  quantity?: number;
};

export type CashCartResult = {
  transactionId: string;
  amount: number;
  status: string;
  transactionItems: Array<{
    id: string;
    sessionId: string | null;
    packId: string | null;
    amount: number;
  }>;
  receipt: ReceiptDetail | null;
};

/**
 * Checkout CASH de carrito (múltiples drop-ins en una sola transacción).
 * Por ahora solo DROP_IN (packs en otra PR).
 */
export function startCashCart(
  memberId: string,
  items: CashCartItem[],
  idempotencyKey: string = newIdempotencyKey('cash-cart'),
): Promise<CashCartResult> {
  return apiRequest<CashCartResult>(
    `/members/${memberId}/transaction-items/cash/cart`,
    {
      method: 'POST',
      body: { items, idempotencyKey },
    },
  );
}
