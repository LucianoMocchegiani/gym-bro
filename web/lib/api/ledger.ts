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
  memberId: string | null;
  memberName: string | null;
  memberEmail: string;
  /** Venta de plataforma (Caja de `admin`): gym al que se le vendió el plan. */
  billedTenantName: string | null;
  /** False en planes de Faciliter viejos cobrados en el gym: solo los devuelve `admin`. */
  refundable: boolean;
  recordedByStaffName: string | null;
  mpPaymentId: string | null;
  items: PaymentLineDetail[];
};
