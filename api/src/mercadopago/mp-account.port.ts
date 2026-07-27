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
 * Input para crear Preference de un pack.
 */
export type CreateMpPreferenceInput = {
  accessToken: string;
  title: string;
  amount: number;
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
   * Solicita reembolso total de un pago MP.
   *
   * @returns true si MP aceptó; false si debe marcarse manual pendiente.
   */
  abstract refundPayment(
    accessToken: string,
    mpPaymentId: string,
    amount: number,
  ): Promise<{ ok: boolean; manualPending: boolean }>;
}

/** Token de inyección Nest para el adapter concreto. */
export const MP_ACCOUNT_PORT = Symbol('MP_ACCOUNT_PORT');
