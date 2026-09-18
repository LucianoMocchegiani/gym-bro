/**
 * Cola operativa de vencimientos MONTHLY (recepción).
 *
 * @remarks No es un reporte de ingresos. RN-CON-001 / RN-ACC-005.
 */

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
