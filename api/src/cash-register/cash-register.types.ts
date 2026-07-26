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
  kind: 'INCOME';
  concept: 'PACK_CONTRACT' | 'DROP_IN';
  createdAt: Date;
};

/**
 * Caja del día: totales + movimientos (CU-PAG-003 parcial, sin arqueo).
 */
export type CashDayDetail = {
  tenantId: string;
  businessDate: string;
  timezone: 'America/Argentina/Buenos_Aires';
  totals: {
    income: number;
    movementCount: number;
  };
  movements: CashMovementDetail[];
};
