import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';

export const IMPERSONATION_HANDOFF_COOKIE = 'impersonation_handoff';

const MAX_AGE_SECONDS = 60;

/**
 * Domain de cookie compartida entre subdominios (`admin` y el gym).
 *
 * @remarks `COOKIE_PARENT_DOMAIN` gana; si no, `.` + `CORS_APP_DOMAIN`.
 * Sin dominio (solo localhost) el browser no comparte la cookie entre hosts.
 */
export function cookieParentDomain(config: ConfigService): string | undefined {
  const explicit = config.get<string>('COOKIE_PARENT_DOMAIN')?.trim();
  if (explicit) {
    return explicit.startsWith('.') ? explicit : `.${explicit}`;
  }
  const app = config.get<string>('CORS_APP_DOMAIN')?.trim().toLowerCase();
  if (app) {
    return `.${app.replace(/^\./, '')}`;
  }
  return undefined;
}

function cookieOpts(config: ConfigService): {
  httpOnly: true;
  secure: true;
  sameSite: 'none';
  path: '/';
  maxAge: number;
  domain?: string;
} {
  const domain = cookieParentDomain(config);
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: MAX_AGE_SECONDS * 1000,
    ...(domain ? { domain } : {}),
  };
}

/**
 * Setea la cookie de handoff (SameSite=None; Secure — hace falta HTTPS).
 */
export function setHandoffCookie(
  res: Response,
  config: ConfigService,
  handoffId: string,
): void {
  res.cookie(IMPERSONATION_HANDOFF_COOKIE, handoffId, cookieOpts(config));
}

/**
 * Borra la cookie con los mismos atributos (si no, el browser la ignora).
 */
export function clearHandoffCookie(
  res: Response,
  config: ConfigService,
): void {
  const opts = cookieOpts(config);
  res.clearCookie(IMPERSONATION_HANDOFF_COOKIE, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
    ...(opts.domain ? { domain: opts.domain } : {}),
  });
}
