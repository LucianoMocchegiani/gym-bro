/**
 * Reportes mínimos (E11) — ingresos $ + snapshot comercial.
 */

import { apiRequest } from '@/lib/api/client';

export type ReportPaymentRow = {
  id: string;
  amount: number;
  method: 'STUB' | 'CASH' | 'MP';
  status: 'APPROVED';
  createdAt: string;
  memberId: string;
  memberName: string | null;
  memberEmail: string;
  packId: string | null;
  packName: string | null;
  kind: 'PACK' | 'DROP_IN';
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
      STUB: number;
    };
    payments: ReportPaymentRow[];
    paymentCount: number;
  };
};

/**
 * Resumen de reportes. Default API: mes calendario actual (BA).
 */
export function getReportsSummary(input?: {
  from?: string;
  to?: string;
}): Promise<ReportsSummary> {
  const params = new URLSearchParams();
  if (input?.from) {
    params.set('from', input.from);
  }
  if (input?.to) {
    params.set('to', input.to);
  }
  const q = params.toString();
  return apiRequest<ReportsSummary>(
    `/reports/summary${q ? `?${q}` : ''}`,
  );
}
