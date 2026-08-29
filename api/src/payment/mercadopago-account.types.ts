/**
 * Estado público de la cuenta MP del tenant (sin secretos).
 */
export type MercadoPagoAccountStatus = {
  connected: boolean;
  publicKeyMasked: string | null;
  mpUserId: string | null;
  lastValidatedAt: string | null;
  lastValidationOk: boolean | null;
  updatedAt: string | null;
};

/**
 * Resultado de POST test de credenciales guardadas.
 */
export type MercadoPagoAccountTestResult = {
  ok: boolean;
  mpUserId: string | null;
  nickname: string | null;
  validatedAt: string;
};
