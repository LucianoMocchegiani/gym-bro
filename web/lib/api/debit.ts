/**
 * Débito automático MONTHLY (Caja) — suscripción MP, sin tarjeta en Faciliter.
 */

import { apiRequest } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';

export type DebitMandateStatus =
  | 'PENDING_CHECKOUT'
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
  nextChargeOn: string | null;
  initPoint: string | null;
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
  checkoutUrl: string | null;
};

export type EnrollDebitInput = {
  packId: string;
  chargeNow: boolean;
  idempotencyKey?: string;
};

export type ListDebitParams = ListParams & {
  bucket?: 'due' | 'pending' | 'retrying' | 'failed' | 'all';
  memberId?: string;
};

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
 * Alta de mandato: crea preapproval y devuelve `checkoutUrl`.
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
 * Baja el mandato (cancela preapproval en MP).
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
 * Cambia el pack del próximo cobro (nuevo link de autorización).
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
