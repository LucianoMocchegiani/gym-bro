/**
 * Resultado de validar un access_token contra Mercado Pago.
 */
export type MpAccountValidation = {
  /** `id` numérico/string del usuario colector en MP. */
  userId: string;
  nickname?: string;
};

/**
 * Preferencia Checkout Pro creada en la cuenta del gym.
 */
export type MpPreferenceResult = {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string | null;
};

/**
 * Estado de un pago consultado en MP.
 */
export type MpRemotePayment = {
  id: string;
  status: string;
  externalReference: string | null;
  preferenceId: string | null;
  transactionAmount: number | null;
};

/**
 * Orden comercial consultada en MP.
 */
export type MpRemoteMerchantOrder = {
  id: string;
  status: string;
  externalReference: string | null;
  payments: Array<{
    id: string;
    status: string;
    transactionAmount: number | null;
  }>;
};

/**
 * Ítem de una Preference Checkout Pro.
 *
 * @remarks `title` es lo que MP muestra en «Descripción de la compra»
 * (máx. 256). `description` va al ticket/email de MP si el flujo lo lista.
 */
export type MpPreferenceItem = {
  id?: string;
  title: string;
  description?: string;
  quantity: number;
  unit_price: number;
};

/**
 * Input para crear Preference (1 ítem → pack/drop-in; varios → carrito MP).
 */
export type CreateMpPreferenceInput = {
  accessToken: string;
  items: MpPreferenceItem[];
  externalReference: string;
  notificationUrl: string;
  payerEmail?: string;
};

/**
 * Puerto Mercado Pago (cuenta + checkout).
 *
 * @remarks RN-PAG-001 / CU-PAG-001 / CU-PAG-006.
 */
export abstract class MpAccountPort {
  /**
   * Valida que el access_token sea aceptado por MP.
   *
   * @throws {Error} Si la API rechaza el token o no responde.
   */
  abstract validateAccessToken(
    accessToken: string,
  ): Promise<MpAccountValidation>;

  /**
   * Crea Preference Checkout Pro en la cuenta del gym.
   */
  abstract createPreference(
    input: CreateMpPreferenceInput,
  ): Promise<MpPreferenceResult>;

  /**
   * Obtiene un pago remoto por id (para webhook).
   */
  abstract getPayment(
    accessToken: string,
    mpPaymentId: string,
  ): Promise<MpRemotePayment>;

  /**
   * Obtiene una orden comercial remota por id (para webhook type=merchant_order).
   */
  abstract getMerchantOrder(
    accessToken: string,
    merchantOrderId: string,
  ): Promise<MpRemoteMerchantOrder>;

  /**
   * Solicita reembolso de un pago MP (total o parcial por `amount`).
   *
   * @param amount - Monto a devolver (unidad del pago). Siempre se envía;
   *   refunds sucesivos van contra el saldo que queda en MP.
   * @param idempotencyKey - Único por ejecución (evita duplicar el mismo lote).
   */
  abstract refundPayment(
    accessToken: string,
    mpPaymentId: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<{ ok: boolean; manualPending: boolean }>;
}

/** Token de inyección Nest para el adapter concreto. */
export const MP_ACCOUNT_PORT = Symbol('MP_ACCOUNT_PORT');
