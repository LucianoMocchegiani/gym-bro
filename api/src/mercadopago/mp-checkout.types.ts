/**
 * Respuesta de checkout MP (pack o drop-in).
 */
export type MpCheckoutResult = {
  paymentId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  amount: number;
  kind: 'PACK' | 'DROP_IN';
  packId: string | null;
  sessionId: string | null;
  idempotencyKey: string;
  mpPreferenceId: string | null;
  checkoutUrl: string | null;
  sandboxCheckoutUrl: string | null;
  contractId: string | null;
  reservationId: string | null;
};

/**
 * Resultado procesado del webhook / simulate.
 */
export type MpWebhookProcessResult = {
  handled: boolean;
  paymentId: string | null;
  status: string | null;
  contractId: string | null;
  reservationId: string | null;
};
