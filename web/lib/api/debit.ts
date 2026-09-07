/**
 * Débito automático MONTHLY (Caja).
 */

import { apiRequest } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';

export type DebitMandateStatus =
  | 'ACTIVE'
  | 'RETRYING'
  | 'FAILED'
  | 'CANCELLED';

export type DebitMandateDetail = {
  id: string;
  memberId: string;
  memberName: string | null;
  memberEmail: string;
  packId: string;
  packName: string;
  packPrice: number;
  status: DebitMandateStatus;
  attemptCount: number;
  lastError: string | null;
  lastChargedAt: string | null;
  nextChargeOn: string;
  cardLastFour: string | null;
  enrolledTransactionItemId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MemberDebitView = {
  mandate: DebitMandateDetail | null;
  currentMonthly: {
    contractId: string;
    packId: string;
    packName: string;
    endsAt: string;
  } | null;
};

export type DebitEnrollResult = {
  mandate: DebitMandateDetail;
  transactionId: string | null;
  receiptReady: boolean;
};

export type EnrollDebitInput = {
  packId: string;
  cardToken: string;
  paymentMethodId?: string;
  issuerId?: string;
  installments?: number;
  identificationType?: string;
  identificationNumber?: string;
  chargeNow: boolean;
  idempotencyKey?: string;
};

export type ListDebitParams = ListParams & {
  bucket?: 'due' | 'retrying' | 'failed' | 'all';
  memberId?: string;
};

/**
 * Public key MP para Card Payment Brick (`cashier.operate`).
 */
export function getMpPublicKey(): Promise<{ publicKey: string }> {
  return apiRequest<{ publicKey: string }>('/mercadopago/account/public-key');
}

/**
 * Cola de mandatos.
 */
export function listDebitMandates(
  params?: ListDebitParams,
): Promise<ListResult<DebitMandateDetail>> {
  const qs = toSearchParams(params);
  return apiRequest<ListResult<DebitMandateDetail>>(
    `/debit-mandates${qs ? `?${qs}` : ''}`,
  );
}

/**
 * Vista de débito de un afiliado.
 */
export function getMemberDebitView(
  memberId: string,
): Promise<MemberDebitView> {
  return apiRequest<MemberDebitView>(`/members/${memberId}/debit-mandate`);
}

/**
 * Alta de mandato (cobro o solo tarjeta).
 */
export function enrollDebitMandate(
  memberId: string,
  input: EnrollDebitInput,
): Promise<DebitEnrollResult> {
  return apiRequest<DebitEnrollResult>(
    `/members/${memberId}/debit-mandates`,
    { method: 'POST', body: input },
  );
}

/**
 * Baja el mandato.
 */
export function cancelDebitMandate(
  mandateId: string,
): Promise<DebitMandateDetail> {
  return apiRequest<DebitMandateDetail>(
    `/debit-mandates/${mandateId}/cancel`,
    { method: 'POST' },
  );
}

/**
 * Cambia el pack del próximo cobro.
 */
export function updateDebitMandatePack(
  mandateId: string,
  packId: string,
): Promise<DebitMandateDetail> {
  return apiRequest<DebitMandateDetail>(`/debit-mandates/${mandateId}`, {
    method: 'PATCH',
    body: { packId },
  });
}

/**
 * Dispara el cobro del periodo (mismo que el job).
 */
export function chargeDebitMandateNow(
  mandateId: string,
): Promise<DebitEnrollResult> {
  return apiRequest<DebitEnrollResult>(
    `/debit-mandates/${mandateId}/charge`,
    { method: 'POST' },
  );
}
