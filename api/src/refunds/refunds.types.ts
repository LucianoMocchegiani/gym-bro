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
 * Resultado de ejecutar un reembolso.
 */
export type RefundExecutionDetail = {
  transactionItemId: string;
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
