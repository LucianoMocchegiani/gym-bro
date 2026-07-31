/**
 * Tipos del resumen de reportes mínimos (E11) — foco en dinero + contexto comercial.
 */

export type ReportPaymentRow = {
  id: string;
  amount: number;
  method: 'STUB' | 'CASH' | 'MP';
  status: 'APPROVED';
  createdAt: Date;
  memberId: string;
  memberName: string | null;
  memberEmail: string;
  packId: string | null;
  packName: string | null;
  /** Pack contratado vs drop-in (tiene sessionId). */
  kind: 'PACK' | 'DROP_IN';
};

/**
 * Resumen de ingresos del período + snapshot comercial.
 *
 * @remarks Conteos de afiliados/contratos son punto en el tiempo;
 * ingresos filtran por `createdAt` en el rango `[from, to]`.
 * Historial de puerta vive en `/puerta` (`access-attempts`).
 */
export type ReportsSummary = {
  from: string;
  to: string;
  timezone: 'America/Argentina/Buenos_Aires';
  members: {
    active: number;
    suspended: number;
    inactive: number;
    /** Proxy de “deuda”: ACTIVE sin contrato ACTIVE. */
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
    /** Hasta 200 filas, más recientes primero. */
    payments: ReportPaymentRow[];
    paymentCount: number;
  };
};
