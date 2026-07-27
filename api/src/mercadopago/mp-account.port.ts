/**
 * Resultado de validar un access_token contra Mercado Pago.
 */
export type MpAccountValidation = {
  /** `id` numérico/string del usuario colector en MP. */
  userId: string;
  nickname?: string;
};

/**
 * Puerto de cuenta Mercado Pago (validación de credenciales).
 *
 * @remarks Checkout/preferencias/refunds se agregarán en el mismo puerto
 * en tareas posteriores de E5. RN-PAG-001 / CU-PAG-006.
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
}

/** Token de inyección Nest para el adapter concreto. */
export const MP_ACCOUNT_PORT = Symbol('MP_ACCOUNT_PORT');
