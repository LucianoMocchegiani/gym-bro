/**
 * Estados de checkout MP.
 */
export type MpCheckoutStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';

/**
 * Línea de un carrito MP (agrupa los transactionItems del mismo ítem).
 */
export type MpCartLine = {
  kind: 'PACK' | 'DROP_IN';
  refId: string;
  /** Título para la Preference (solo en creación; no persistido). */
  title?: string;
  quantity: number;
  amount: number;
  transactionItemIds: string[];
};

/**
 * Respuesta de checkout de carrito MP (1 preference → 1 pago, modelo MercadoLibre).
 */
export type MpCartCheckoutResult = {
  transactionId: string;
  memberId: string;
  status: MpCheckoutStatus;
  amount: number;
  idempotencyKey: string;
  mpPreferenceId: string | null;
  checkoutUrl: string | null;
  sandboxCheckoutUrl: string | null;
  lines: MpCartLine[];
};

/**
 * Resultado procesado del webhook.
 */
export type MpWebhookProcessResult = {
  handled: boolean;
  transactionItemId: string | null;
  transactionId: string | null;
  status: string | null;
  contractId: string | null;
  reservationId: string | null;
};
