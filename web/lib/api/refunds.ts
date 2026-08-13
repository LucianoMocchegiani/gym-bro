/**
 * Devoluciones API (módulo `refunds`) — CU-PAG-004/005/007.
 */

import { apiRequest } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';

export type RefundRequestStatus = 'PENDING' | 'REJECTED' | 'EXECUTED';

export type RefundMotiveCode = 'doble_cobro' | 'solicitud' | 'otro';

export type RefundRequestDetail = {
  id: string;
  tenantId: string;
  paymentId: string;
  memberId: string;
  status: RefundRequestStatus;
  reason: string | null;
  rejectionReason: string | null;
  resolvedByStaffId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RefundExecutionDetail = {
  paymentId: string;
  status: 'REFUNDED';
  method: 'STUB' | 'CASH' | 'MP';
  amount: number;
  reason: string;
  motiveCode: string | null;
  mpRefundManualPending: boolean;
  contractId: string | null;
  reservationId: string | null;
  refundRequestId: string | null;
  refundedAt: string;
};

export type ListRefundRequestsInput = {
  status?: RefundRequestStatus;
} & ListParams;

export type ExecuteRefundInput = {
  reason: string;
  motiveCode?: RefundMotiveCode;
  refundRequestId?: string;
};

/**
 * Lista solicitudes de devolución del gym (`payments.refund`).
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
 * Ejecuta devolución total de un pago (`payments.refund`).
 *
 * @remarks RN-PAG-011: staff con flag puede devolver siempre.
 * Si hay solicitud PENDING del pago, la API la marca EXECUTED.
 */
export function executeRefund(
  paymentId: string,
  input: ExecuteRefundInput,
): Promise<RefundExecutionDetail> {
  return apiRequest<RefundExecutionDetail>(`/payments/${paymentId}/refunds`, {
    method: 'POST',
    body: input,
  });
}
