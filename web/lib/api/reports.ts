/**
 * Reportes mínimos (E11) — ingresos $ + snapshot comercial.
 *
 * Movimientos: misma fila que caja (cobro o devolución por cart).
 */

import { apiRequest } from '@/lib/api/client';
import type { LedgerMovementRow } from '@/lib/api/ledger';

export type ReportTransactionRow = LedgerMovementRow;

export type ReportsSummary = {
  from: string;
  to: string;
  timezone: 'America/Argentina/Buenos_Aires';
  members: {
    active: number;
    suspended: number;
    inactive: number;
    activeWithoutActiveContract: number;
  };
  contracts: {
    active: number;
    expired: number;
    cancelled: number;
    refunded: number;
  };
  income: {
    totalApproved: number;
    totalRefunded: number;
    byMethod: {
      CASH: number;
      MP: number;
    };
    transactions: ReportTransactionRow[];
    transactionCount: number;
  };
};

/**
 * Resumen de reportes. Default API: mes calendario actual (BA).
 */
export function getReportsSummary(input?: {
  from?: string;
  to?: string;
  memberId?: string;
}): Promise<ReportsSummary> {
  const params = new URLSearchParams();
  if (input?.from) {
    params.set('from', input.from);
  }
  if (input?.to) {
    params.set('to', input.to);
  }
  if (input?.memberId) {
    params.set('memberId', input.memberId);
  }
  const q = params.toString();
  return apiRequest<ReportsSummary>(
    `/reports/summary${q ? `?${q}` : ''}`,
  );
}
