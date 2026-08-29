/**
 * Refunds API (CU-PAG-004 / CU-PAG-005 / RN-PAG-012).
 */

import { apiRequest } from '@/lib/api/client';
import type { ListResult } from '@/lib/api/list';

export type RefundMotiveCode = 'solicitud' | 'doble_cobro' | 'otro';

export type RefundRequestStatus = 'PENDING' | 'EXECUTED' | 'REJECTED';

export type RefundRequestDetail = {
  id: string;
  transactionItemId: string;
  memberId: string;
  status: RefundRequestStatus;
  reason: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByStaffId: string | null;
};

export type RefundExecutionDetail = {
  id: string;
  transactionItemId: string;
  status: string;
  refundedAt: string;
  refundReason: string | null;
  refundRequestId?: string;
};

export type ListRefundRequestsInput = {
  status?: 'PENDING' | 'EXECUTED' | 'REJECTED';
  memberId?: string;
  page?: number;
  pageSize?: number;
};

function toSearchParams(input?: ListRefundRequestsInput): URLSearchParams {
  const params = new URLSearchParams();
  if (!input) return params;
  if (input.status) params.set('status', input.status);
  if (input.memberId) params.set('memberId', input.memberId);
  if (input.page) params.set('page', String(input.page));
  if (input.pageSize) params.set('pageSize', String(input.pageSize));
  return params;
}

/**
 * Lista solicitudes de devolución del gym (`transaction_items.refund`).
 */
export function listRefundRequests(
  input?: ListRefundRequestsInput,
): Promise<ListResult<RefundRequestDetail>> {
  const qs = toSearchParams(input);
  return apiRequest<ListResult<RefundRequestDetail>>(
    `/refund-requests${qs ? `?${qs}` : ''}`,
  );
}

/**
 * Ejecuta devolución total de un transactionItem (`transaction_items.refund`).
 *
 * @remarks RN-PAG-011: staff con flag puede devolver siempre.
 * Si hay solicitud PENDING del transactionItem, la API la marca EXECUTED.
 */
export function executeRefund(
  transactionItemId: string,
  input: { motiveCode?: string; note?: string },
): Promise<RefundExecutionDetail> {
  return apiRequest<RefundExecutionDetail>(`/transaction-items/${transactionItemId}/refunds`, {
    method: 'POST',
    body: input,
  });
}
