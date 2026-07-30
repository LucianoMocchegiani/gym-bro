/**
 * Reservations API (módulo `reservations`).
 */

import { apiRequest, newIdempotencyKey } from '@/lib/api/client';

export type ReservationDetail = {
  id: string;
  sessionId: string;
  memberId: string;
  status: string;
  coverage: 'CREDIT' | 'DROP_IN';
};

/**
 * Reserva drop-in con pago CASH (entra a caja).
 */
export function createCashDropIn(
  memberId: string,
  sessionId: string,
  idempotencyKey: string = newIdempotencyKey('cash-dropin'),
): Promise<ReservationDetail> {
  return apiRequest<ReservationDetail>(
    `/members/${memberId}/reservations`,
    {
      method: 'POST',
      body: {
        sessionId,
        coverage: 'DROP_IN',
        method: 'CASH',
        idempotencyKey,
      },
    },
  );
}
