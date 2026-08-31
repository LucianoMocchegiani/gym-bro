/**
 * Solicitud / resultado de devolución expuesto por la API.
 */
export type RefundRequestDetail = {
  id: string;
  tenantId: string;
  transactionItemId: string;
  memberId: string;
  status: 'PENDING' | 'REJECTED' | 'EXECUTED';
  reason: string | null;
  rejectionReason: string | null;
  resolvedByStaffId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Resultado de ejecutar un reembolso (endpoint por ítem, wrapper del lote).
 */
export type RefundExecutionDetail = {
  transactionId: string;
  transactionItemId: string;
  transactionItemIds: string[];
  status: 'REFUNDED';
  method: 'STUB' | 'CASH' | 'MP';
  amount: number;
  reason: string;
  motiveCode: string | null;
  mpRefundManualPending: boolean;
  contractId: string | null;
  reservationId: string | null;
  refundRequestId: string | null;
  receiptId: string | null;
  refundedAt: string;
};

/**
 * Resultado de devolver uno o más ítems de un cart (CU-PAG-005).
 */
export type RefundBatchExecutionDetail = {
  transactionId: string;
  transactionItemIds: string[];
  status: 'REFUNDED';
  method: 'STUB' | 'CASH' | 'MP';
  amount: number;
  reason: string;
  motiveCode: string | null;
  mpRefundManualPending: boolean;
  receiptId: string | null;
  refundRequestIds: string[];
  refundedAt: string;
};
