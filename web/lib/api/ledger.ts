import type { PaymentLineDetail } from '@/lib/api/payment-lines';

/**
 * Categoría comercial del asiento (no es ingreso/egreso).
 *
 * @remarks Hoy SALE / REFUND. Post-MVP: compra y gastos.
 */
export type LedgerCategory = 'SALE' | 'REFUND';

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
  /** Ausente solo si el payload es anterior al campo. */
  category?: LedgerCategory;
  createdAt: string;
  memberId: string;
  memberName: string | null;
  memberEmail: string;
  recordedByStaffName: string | null;
  mpPaymentId: string | null;
  items: PaymentLineDetail[];
};
