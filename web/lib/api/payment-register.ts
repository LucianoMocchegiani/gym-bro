/**
 * Payment register API (módulo `payment-register`).
 */

import { apiRequest } from '@/lib/api/client';

export type CashMovementDetail = {
  id: string;
  tenantId: string;
  businessDate: string;
  transactionItemId: string;
  transactionId: string;
  memberId: string;
  memberName: string | null;
  recordedByStaffId: string | null;
  recordedByStaffName: string | null;
  amount: number;
  kind: 'INCOME' | 'OUTCOME';
  concept: 'PACK_CONTRACT' | 'DROP_IN' | 'REFUND';
  createdAt: string;
};

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
  createdAt: string;
};

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

/**
 * Fecha de negocio hoy en timezone BA (`YYYY-MM-DD`).
 */
export function todayBusinessDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date());
}

/**
 * Caja del día (`cashier.operate`).
 */
export function getCashDay(date?: string): Promise<CashDayDetail> {
  const q = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiRequest<CashDayDetail>(`/payment-register/day${q}`);
}

/**
 * Arqueo del día (un arqueo por fecha).
 */
export function reconcileCashDay(input: {
  date?: string;
  declaredAmount: number;
  note?: string;
}): Promise<CashDayDetail> {
  return apiRequest<CashDayDetail>('/payment-register/day/reconcile', {
    method: 'POST',
    body: input,
  });
}
