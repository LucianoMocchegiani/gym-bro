/**
 * Estados de checkout MP (single o carrito).
 */
export type MpCheckoutStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';

/**
 * Respuesta de checkout MP (pack o drop-in).
 */
export type MpCheckoutResult = {
  paymentId: string;
  status: MpCheckoutStatus;
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
 * Línea de un carrito MP (agrupa los payments del mismo ítem).
 */
export type MpCartLine = {
  kind: 'PACK' | 'DROP_IN';
  refId: string;
  /** Título para la Preference (solo en creación; no persistido). */
  title?: string;
  quantity: number;
  amount: number;
  paymentIds: string[];
};

/**
 * Respuesta de checkout de carrito MP (1 preference → 1 pago, modelo MercadoLibre).
 */
export type MpCartCheckoutResult = {
  cartId: string;
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
 * Resultado procesado del webhook / simulate.
 */
export type MpWebhookProcessResult = {
  handled: boolean;
  paymentId: string | null;
  cartId: string | null;
  status: string | null;
  contractId: string | null;
  reservationId: string | null;
};
