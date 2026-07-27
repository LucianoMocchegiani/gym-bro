/**
 * Comprobante interno expuesto por la API (RN-PAG-009).
 */
export type ReceiptDetail = {
  id: string;
  tenantId: string;
  paymentId: string;
  memberId: string;
  number: number;
  /** Código legible, ej. `GB-000001`. */
  code: string;
  amount: number;
  method: 'STUB' | 'CASH' | 'MP';
  concept: 'PACK_CONTRACT' | 'DROP_IN';
  description: string | null;
  createdAt: Date;
};
