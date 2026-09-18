/**
 * Cola de vencimientos MONTHLY (`GET /expirations`).
 */

import { apiRequest } from '@/lib/api/client';

export type ExpirationBucket = 'upcoming' | 'tolerance';
export type ExpirationPayKind = 'debit' | 'debit_failed' | 'manual';

export type ExpirationRow = {
  memberId: string;
  memberName: string | null;
  memberEmail: string;
  contractId: string;
  packId: string;
  packName: string;
  endsOn: string;
  daysUntil: number;
  bucket: ExpirationBucket;
  payKind: ExpirationPayKind;
  mandateStatus: string | null;
};

export type ExpirationsList = {
  today: string;
  timezone: 'America/Argentina/Buenos_Aires';
  windowDays: number;
  debtToleranceDays: number;
  counts: {
    total: number;
    upcoming: number;
    tolerance: number;
    debit: number;
    manual: number;
  };
  items: ExpirationRow[];
};

/**
 * Lista de MONTHLY por vencer o en tolerancia.
 *
 * @remarks Requiere `members.read`.
 */
export function listExpirations(input?: {
  view?: 'all' | 'upcoming' | 'tolerance';
  pay?: 'all' | 'debit' | 'manual';
}): Promise<ExpirationsList> {
  const params = new URLSearchParams();
  if (input?.view && input.view !== 'all') {
    params.set('view', input.view);
  }
  if (input?.pay && input.pay !== 'all') {
    params.set('pay', input.pay);
  }
  const q = params.toString();
  return apiRequest<ExpirationsList>(`/expirations${q ? `?${q}` : ''}`);
}
