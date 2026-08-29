/**
 * Reservations API (módulo `reservations`).
 */

import { apiRequest, newIdempotencyKey } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';

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

/**
 * Reserva drop-in con pago CASH (entra a caja).
 */
export function createCashDropIn(
  memberId: string,
  sessionId: string,
  idempotencyKey: string = newIdempotencyKey('cash-dropin'),
): Promise<ReservationDetail> {
  return apiRequest<ReservationDetail>(`/members/${memberId}/reservations`, {
    method: 'POST',
    body: {
      sessionId,
      coverage: 'DROP_IN',
      method: 'CASH',
      idempotencyKey,
    },
  });
}
