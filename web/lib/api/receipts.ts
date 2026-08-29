/**
 * Receipts API (módulo `receipts`, RN-PAG-009).
 */

import { apiRequest } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';

export type ReceiptMethod = 'STUB' | 'CASH' | 'MP';
export type ReceiptConcept = 'PACK_CONTRACT' | 'DROP_IN';

export type ReceiptDetail = {
  id: string;
  tenantId: string;
  transactionItemId: string;
  memberId: string;
  number: number;
  /** Código legible, ej. `GB-000001`. */
  code: string;
  amount: number;
  method: ReceiptMethod;
  concept: ReceiptConcept;
  description: string | null;
  createdAt: string;
};

/**
 * Comprobante de un transactionItem APPROVED (`members.read`).
 */
export function getReceiptByTransactionItem(
  transactionItemId: string,
): Promise<ReceiptDetail> {
  return apiRequest<ReceiptDetail>(`/transaction-items/${transactionItemId}/receipt`);
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
