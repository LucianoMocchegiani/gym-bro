/**
 * Estado real de un cobro en Mercado Pago (consulta en el momento).
 */

import { apiRequest } from '@/lib/api/client';

export type MpPaymentFee = {
  type: string;
  amount: number;
  /** `collector` = la paga el gym; `payer` = la paga el comprador. */
  payer: string | null;
};

export type MpPaymentStatusView = {
  mpPaymentId: string;
  status: string;
  statusDetail: string | null;
  dateApproved: string | null;
  amount: number | null;
  netReceivedAmount: number | null;
  fees: MpPaymentFee[];
  feesTotal: number;
  moneyReleaseDate: string | null;
  moneyReleaseStatus: string | null;
  /** La plata ya está disponible en la cuenta. */
  released: boolean;
  collectorId: string | null;
  /** Null si no se pudo comparar con la cuenta conectada. */
  collectorMatches: boolean | null;
};

/**
 * Estado en MP del cobro de un cart (`members.read`).
 */
export function getTransactionMpPayment(
  transactionId: string,
): Promise<MpPaymentStatusView> {
  return apiRequest<MpPaymentStatusView>(
    `/transactions/${transactionId}/mp-payment`,
  );
}
