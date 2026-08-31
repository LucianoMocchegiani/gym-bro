import type { PaymentLineDetail } from '../payment/payment-line';

/**
 * Comprobante interno expuesto por la API (RN-PAG-009).
 */
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
  method: 'STUB' | 'CASH' | 'MP';
  concept: 'PACK_CONTRACT' | 'DROP_IN' | 'REFUND';
  description: string | null;
  createdAt: Date;
  /** Líneas del cart (pack/contrato o drop-in/reserva). Vacío si el cobro no tiene ítems. */
  lines: PaymentLineDetail[];
};
