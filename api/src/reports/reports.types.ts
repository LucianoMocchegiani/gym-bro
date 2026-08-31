import type { LedgerMovementRow } from '../payment/ledger-row';

/**
 * Tipos del resumen de reportes mínimos (E11) — dinero + snapshot comercial.
 *
 * Movimientos: cobro por cart o ejecución de devolución (misma grilla que caja).
 */
export type ReportTransactionRow = LedgerMovementRow;

/**
 * Resumen de ingresos del período + snapshot comercial.
 *
 * @remarks Conteos de afiliados/contratos son punto en el tiempo;
 * movimientos filtran por `businessDate` en el rango `[from, to]`.
 */
export type ReportsSummary = {
  from: string;
  to: string;
  timezone: 'America/Argentina/Buenos_Aires';
  members: {
    active: number;
    suspended: number;
    inactive: number;
    /** Proxy de "deuda": ACTIVE sin contrato ACTIVE. */
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
    /** Cobros y devoluciones (egreso = una ejecución, no todo el historial del cart). */
    transactions: ReportTransactionRow[];
    transactionCount: number;
  };
};
