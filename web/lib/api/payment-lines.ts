/** Servicio incluido en un pack (`credits` null = acceso libre). */
export type PaymentLineService = {
  name: string;
  credits: number | null;
};

/**
 * Línea comercial de un cart cobrado (mismo payload en comprobante y reportes).
 */
export type PaymentLineDetail = {
  id: string;
  kind: 'PACK' | 'DROP_IN';
  title: string;
  amount: number;
  /** Ausente en payloads viejos: se trata como cobrado. */
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  outcome: 'CONTRACT' | 'RESERVATION' | null;
  contract: { startsAt: string; endsAt: string | null } | null;
  session: {
    startsAt: string;
    endsAt: string;
    branchName: string;
  } | null;
  services: PaymentLineService[];
};
