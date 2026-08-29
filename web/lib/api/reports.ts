/**
 * Reportes mínimos (E11) — ingresos $ + snapshot comercial.
 *
 * Transacciones agrupadas: MP por cart_checkout, efectivo por payment individual.
 */

import { apiRequest } from '@/lib/api/client';

export type ReportTransactionItem = {
  id: string;
  amount: number;
  kind: 'PACK' | 'DROP_IN';
  packName: string | null;
};

export type ReportTransactionRow = {
  id: string;
  amount: number;
  method: 'CASH' | 'MP';
  status: 'APPROVED';
  createdAt: string;
  memberId: string;
  memberName: string | null;
  memberEmail: string;
  mpPaymentId: string | null;
  items: ReportTransactionItem[];
};

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
