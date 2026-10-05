import type { ReceiptDetail } from '../receipts/receipts.types';

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
  /** Pack ONE_TIME del drop-in; solo `DROP_IN`. */
  packId?: string;
  /** Título para la Preference (solo en creación; no persistido). */
  title?: string;
  /** Descripción Preference (ticket MP; el modal de compra lista sobre todo `title`). */
  description?: string;
  quantity: number;
  amount: number;
  transactionItemIds: string[];
};

/**
 * Respuesta de checkout de carrito MP (1 preference → 1 pago, modelo MercadoLibre).
 */
export type MpCartCheckoutResult = {
  transactionId: string;
  /** Null en ventas de plataforma (Caja del tenant `admin`). */
  memberId: string | null;
  status: MpCheckoutStatus;
  amount: number;
  idempotencyKey: string;
  mpPreferenceId: string | null;
  checkoutUrl: string | null;
  sandboxCheckoutUrl: string | null;
  lines: MpCartLine[];
};

/**
 * Preference MP del alta web de un socio (sin cart todavía).
 */
export type MpSignupPreference = {
  amount: number;
  preferenceId: string;
  checkoutUrl: string | null;
  sandboxCheckoutUrl: string | null;
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

/**
 * Respuesta de checkout CASH de carrito (APPROVED inmediato + comprobante).
 */
export type CashCartResult = {
  transactionId: string;
  amount: number;
  status: string;
  transactionItems: Array<{
    id: string;
    sessionId: string | null;
    packId: string | null;
    amount: number;
  }>;
  receipt: ReceiptDetail | null;
};

/**
 * Estado de un cobro según Mercado Pago, leído en el momento con el token del
 * tenant dueño del cobro.
 *
 * @remarks `released` = la plata ya está disponible en la cuenta.
 * `collectorMatches` null si no hay `mp_user_id` guardado para comparar.
 */
export type MpPaymentStatusView = {
  mpPaymentId: string;
  status: string;
  statusDetail: string | null;
  dateApproved: string | null;
  amount: number | null;
  netReceivedAmount: number | null;
  fees: Array<{ type: string; amount: number; payer: string | null }>;
  feesTotal: number;
  moneyReleaseDate: string | null;
  moneyReleaseStatus: string | null;
  released: boolean;
  collectorId: string | null;
  collectorMatches: boolean | null;
};
