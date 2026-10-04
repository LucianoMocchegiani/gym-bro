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
  /** Vuelta del navegador (success / pending / failure). Sin esto MP no redirige. */
  backUrl?: string;
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

  /**
   * Checkout de suscripción (`init_point`).
   *
   * @remarks Sin `preapproval_plan_id`: MP exige `card_token_id` y status
   * `authorized` en suscripciones con plan; el link requiere `pending` sin plan.
   */
  abstract createPreapproval(
    input: CreateMpPreapprovalInput,
  ): Promise<MpPreapprovalResult>;

  /**
   * Consulta un preapproval por id (webhook).
   */
  abstract getPreapproval(
    accessToken: string,
    preapprovalId: string,
  ): Promise<MpRemotePreapproval>;

  /**
   * Baja la suscripción en MP (`cancelled`).
   */
  abstract cancelPreapproval(
    accessToken: string,
    preapprovalId: string,
  ): Promise<void>;

  /**
   * Cobro de un ciclo de suscripción (webhook authorized_payment).
   */
  abstract getAuthorizedPayment(
    accessToken: string,
    authorizedPaymentId: string,
  ): Promise<MpRemoteAuthorizedPayment>;

  /**
   * Cobros aprobados de una suscripción, del más viejo al más nuevo (por si
   * el webhook del ciclo no llegó).
   *
   * @remarks Solo los que ya tienen pago asociado (`payment.id`).
   */
  abstract listApprovedAuthorizedPayments(
    accessToken: string,
    preapprovalId: string,
  ): Promise<MpSubscriptionPayment[]>;

  /**
   * Canjea el `code` de «Conectar Mercado Pago» por tokens del gym.
   *
   * @throws {Error} Si MP rechaza el código (vencido, usado, redirect distinto).
   */
  abstract exchangeOAuthCode(
    input: ExchangeMpOAuthCodeInput,
  ): Promise<MpOAuthTokens>;

  /**
   * Renueva el access_token con el refresh_token (que rota en cada uso).
   *
   * @throws {Error} Si MP rechaza el refresh_token (revocado o vencido).
   */
  abstract refreshOAuthToken(
    input: RefreshMpOAuthTokenInput,
  ): Promise<MpOAuthTokens>;
}

/** Credenciales de la aplicación de plataforma Faciliter en MP. */
export type MpOAuthClient = {
  clientId: string;
  clientSecret: string;
};

export type ExchangeMpOAuthCodeInput = MpOAuthClient & {
  code: string;
  redirectUri: string;
  /** Solo si la app MP tiene PKCE habilitado. */
  codeVerifier?: string;
};

export type RefreshMpOAuthTokenInput = MpOAuthClient & {
  refreshToken: string;
};

/** Respuesta de `POST /oauth/token`. */
export type MpOAuthTokens = {
  accessToken: string;
  refreshToken: string;
  publicKey: string;
  userId: string;
  /** Segundos hasta el vencimiento del access_token. */
  expiresIn: number;
};

/** Alta de preapproval (link de autorización). */
export type CreateMpPreapprovalInput = {
  accessToken: string;
  reason: string;
  externalReference: string;
  payerEmail: string;
  backUrl: string;
  notificationUrl: string;
  amount: number;
  /** ISO-8601; si hay prueba, primer cobro = fin de los 30 días. */
  startDate?: string;
};

export type MpPreapprovalResult = {
  id: string;
  initPoint: string;
  status: string;
};

export type MpRemotePreapproval = {
  id: string;
  status: string;
  externalReference: string | null;
};

export type MpRemoteAuthorizedPayment = {
  id: string;
  status: string;
  preapprovalId: string | null;
  externalReference: string | null;
  paymentId: string | null;
  transactionAmount: number | null;
};

/** Cobro aprobado de un ciclo de suscripción. */
export type MpSubscriptionPayment = {
  paymentId: string;
  amount: number | null;
};

/** Token de inyección Nest para el adapter concreto. */
export const MP_ACCOUNT_PORT = Symbol('MP_ACCOUNT_PORT');
