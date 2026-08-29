/**
 * Tipos del resumen de reportes mínimos (E11) — foco en dinero + contexto comercial.
 *
 * Transacciones: 1 fila por evento financiero real.
 * - MP: 1 cart_checkout = 1 transacción (puede tener múltiples ítems)
 * - Efectivo: 1 payment = 1 transacción
 */

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
  createdAt: Date;
  memberId: string;
  memberName: string | null;
  memberEmail: string;
  /** Referencia MP (payment id de MP) — solo para transacciones MP. */
  mpPaymentId: string | null;
  /** Ítems de la transacción. MP puede tener N; efectivo siempre 1. */
  items: ReportTransactionItem[];
};

/**
 * Resumen de ingresos del período + snapshot comercial.
 *
 * @remarks Conteos de afiliados/contratos son punto en el tiempo;
 * ingresos filtran por `createdAt` en el rango `[from, to]`.
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
    byMethod: {
      CASH: number;
      MP: number;
    };
    /** Transacciones agrupadas (1 fila por pago real). */
    transactions: ReportTransactionRow[];
    transactionCount: number;
  };
};
