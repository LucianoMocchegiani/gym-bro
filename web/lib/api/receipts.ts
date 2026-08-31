/**
 * Receipts API (módulo `receipts`, RN-PAG-009).
 */

import { apiRequest } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';
import type { PaymentLineDetail } from '@/lib/api/payment-lines';

export type ReceiptMethod = 'STUB' | 'CASH' | 'MP';
export type ReceiptConcept = 'PACK_CONTRACT' | 'DROP_IN' | 'REFUND';

export type ReceiptDetail = {
  id: string;
  tenantId: string;
  transactionItemId: string | null;
  transactionId: string | null;
  memberId: string;
  number: number;
  /** Código legible, ej. `GB-000001`. */
  code: string;
  amount: number;
  method: ReceiptMethod;
  concept: ReceiptConcept;
  description: string | null;
  createdAt: string;
  lines: PaymentLineDetail[];
};

/**
 * Comprobante por id (`members.read`).
 */
export function getReceipt(receiptId: string): Promise<ReceiptDetail> {
  return apiRequest<ReceiptDetail>(`/receipts/${receiptId}`);
}

/**
 * Comprobante de un cart (CASH o MP) (`members.read`).
 */
export function getReceiptByTransaction(
  transactionId: string,
): Promise<ReceiptDetail> {
  return apiRequest<ReceiptDetail>(`/transactions/${transactionId}/receipt`);
}

/**
 * Comprobantes de un afiliado (`members.read`).
 */
export function listMemberReceipts(
  memberId: string,
  input?: ListParams,
): Promise<ListResult<ReceiptDetail>> {
  const qs = toSearchParams(input);
  return apiRequest<ListResult<ReceiptDetail>>(
    `/members/${memberId}/receipts${qs ? `?${qs}` : ''}`,
  );
}
