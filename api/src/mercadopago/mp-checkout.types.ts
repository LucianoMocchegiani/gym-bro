/**
 * Respuesta de checkout MP (pack).
 */
export type MpCheckoutResult = {
  paymentId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  amount: number;
  packId: string;
  idempotencyKey: string;
  mpPreferenceId: string | null;
  checkoutUrl: string | null;
  sandboxCheckoutUrl: string | null;
  contractId: string | null;
};

/**
 * Resultado procesado del webhook / simulate.
 */
export type MpWebhookProcessResult = {
  handled: boolean;
  paymentId: string | null;
  status: string | null;
  contractId: string | null;
};
