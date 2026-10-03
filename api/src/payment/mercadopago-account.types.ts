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
  /** `OAUTH` = «Conectar Mercado Pago»; `MANUAL` = token pegado. */
  connectionMode: 'MANUAL' | 'OAUTH' | null;
  /** Solo OAUTH: vencimiento del access_token (se renueva solo antes). */
  tokenExpiresAt: string | null;
  /** OAUTH con renovación fallida o token vencido: hay que reconectar. */
  needsReconnect: boolean;
  /** El servidor tiene configurada la app de plataforma (botón disponible). */
  oauthAvailable: boolean;
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

/**
 * URL de autorización de MP para «Conectar Mercado Pago».
 */
export type MercadoPagoOAuthStartResult = {
  authorizationUrl: string;
};
