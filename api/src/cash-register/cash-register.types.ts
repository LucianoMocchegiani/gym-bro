/**
 * Movimiento de caja expuesto por la API.
 */
export type CashMovementDetail = {
  id: string;
  tenantId: string;
  businessDate: string;
  paymentId: string;
  memberId: string;
  memberName: string | null;
  recordedByStaffId: string | null;
  recordedByStaffName: string | null;
  amount: number;
  kind: 'INCOME' | 'OUTCOME';
  concept: 'PACK_CONTRACT' | 'DROP_IN' | 'REFUND';
  createdAt: Date;
};

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
 * Caja del día: totales, movimientos y arqueo si existe.
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
  movements: CashMovementDetail[];
  reconciliation: CashReconciliationDetail | null;
};
