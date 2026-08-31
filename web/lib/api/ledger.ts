import type { PaymentLineDetail } from '@/lib/api/payment-lines';

/**
 * Fila de movimientos (caja y reportes): cobro por cart o ejecución de devolución.
 */
export type LedgerMovementRow = {
  id: string;
  transactionId: string;
  receiptId: string | null;
  amount: number;
  method: 'CASH' | 'MP';
  kind: 'INCOME' | 'OUTCOME';
  createdAt: string;
  memberId: string;
  memberName: string | null;
  memberEmail: string;
  recordedByStaffName: string | null;
  mpPaymentId: string | null;
  items: PaymentLineDetail[];
};
