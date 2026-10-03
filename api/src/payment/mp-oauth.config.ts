import type { ConfigService } from '@nestjs/config';

/**
 * Aplicación de plataforma Faciliter en MP Developers («Conectar Mercado Pago»).
 */
export type MpOAuthConfig = {
  clientId: string;
  clientSecret: string;
  /** Tiene que coincidir exacto con la URL de redireccionamiento de la app MP. */
  redirectUri: string;
  /** Si la app MP tiene PKCE habilitado, MP exige code_challenge/code_verifier. */
  pkce: boolean;
};

/**
 * Lee `MP_OAUTH_*`; null si falta client id o secret (OAuth no disponible).
 */
export function readMpOAuthConfig(config: ConfigService): MpOAuthConfig | null {
  const clientId = config.get<string>('MP_OAUTH_CLIENT_ID')?.trim();
  const clientSecret = config.get<string>('MP_OAUTH_CLIENT_SECRET')?.trim();
  if (!clientId || !clientSecret) {
    return null;
  }
  const apiBase =
    config.get<string>('PUBLIC_API_BASE_URL')?.replace(/\/$/, '') ||
    'http://localhost:3001';
  const redirectUri =
    config.get<string>('MP_OAUTH_REDIRECT_URI')?.trim() ||
    `${apiBase}/api/mercadopago/oauth/callback`;
  const pkce = config.get<string>('MP_OAUTH_PKCE')?.trim().toLowerCase();
  return {
    clientId,
    clientSecret,
    redirectUri,
    pkce: pkce !== 'false' && pkce !== '0',
  };
}
