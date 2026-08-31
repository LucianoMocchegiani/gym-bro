import type { LedgerMovementRow } from '../payment/ledger-row';

/**
 * Arqueo de caja del día (CU-PAG-003).
 */
export type CashReconciliationDetail = {
  id: string;
  tenantId: string;
  businessDate: string;
  expectedAmount: number;
  declaredAmount: number;
  difference: number;
  reconciledByStaffId: string | null;
  reconciledByStaffName: string | null;
  note: string | null;
  createdAt: Date;
};

/**
 * Caja del día: totales, movimientos agrupados (misma fila que reportes) y arqueo.
 */
export type CashDayDetail = {
  tenantId: string;
  businessDate: string;
  timezone: 'America/Argentina/Buenos_Aires';
  totals: {
    income: number;
    outcome: number;
    net: number;
    movementCount: number;
  };
  /** 1 fila por cobro o devolución de cart (CU-PAG-003). */
  movements: LedgerMovementRow[];
  reconciliation: CashReconciliationDetail | null;
};
