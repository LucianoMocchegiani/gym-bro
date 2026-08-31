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
  transactionId: string;
  transactionItemId: string;
  transactionItemIds: string[];
  status: string;
  amount: number;
  refundedAt: string;
  reason: string;
  refundRequestId?: string | null;
  receiptId?: string | null;
  mpRefundManualPending?: boolean;
};

export type RefundBatchExecutionDetail = {
  transactionId: string;
  transactionItemIds: string[];
  status: string;
  amount: number;
  reason: string;
  receiptId: string | null;
  mpRefundManualPending: boolean;
  refundedAt: string;
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
 * Ejecuta devolución de un transactionItem (`transaction_items.refund`).
 *
 * @remarks Wrapper del lote del cart. RN-PAG-011.
 */
export function executeRefund(
  transactionItemId: string,
  input: {
    reason: string;
    motiveCode?: RefundMotiveCode;
    refundRequestId?: string;
  },
): Promise<RefundExecutionDetail> {
  return apiRequest<RefundExecutionDetail>(
    `/transaction-items/${transactionItemId}/refunds`,
    {
      method: 'POST',
      body: input,
    },
  );
}

/**
 * Devolución de uno o más ítems de un cart (un refund MP / un egreso).
 */
export function executeTransactionRefund(
  transactionId: string,
  input: {
    transactionItemIds: string[];
    reason: string;
    motiveCode?: RefundMotiveCode;
  },
): Promise<RefundBatchExecutionDetail> {
  return apiRequest<RefundBatchExecutionDetail>(
    `/transactions/${transactionId}/refunds`,
    {
      method: 'POST',
      body: input,
    },
  );
}
