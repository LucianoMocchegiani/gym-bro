import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { HTTPException } from 'hono/http-exception';
import { config } from '../config.js';
import {
  PUBLIC_PROFILE,
  PUBLIC_TENANT_ID,
  type Principal,
} from './principal.js';

const PREFIX = 'pub1.';
const TTL_MS = 24 * 60 * 60 * 1000;

type PublicPayload = {
  sub: string;
  iat: number;
  exp: number;
};

function signBody(body: string): string {
  return createHmac('sha256', config.chatPublicSessionSecret)
    .update(body)
    .digest('base64url');
}

function asPayload(value: unknown): PublicPayload | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const rec = value as { sub?: unknown; iat?: unknown; exp?: unknown };
  if (typeof rec.sub !== 'string' || rec.sub.trim().length === 0) {
    return null;
  }
  if (typeof rec.iat !== 'number' || typeof rec.exp !== 'number') {
    return null;
  }
  return { sub: rec.sub.trim(), iat: rec.iat, exp: rec.exp };
}

/**
 * Token de sesión de la landing (no es JWT Staff ni introspect Nest).
 */
export function isPublicSessionToken(token: string): boolean {
  return token.startsWith(PREFIX);
}

/**
 * Emite una sesión anónima de 24 h.
 */
export function issuePublicSessionToken(userId = randomUUID()): string {
  const now = Date.now();
  const payload: PublicPayload = {
    sub: userId,
    iat: now,
    exp: now + TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${PREFIX}${body}.${signBody(body)}`;
}

/**
 * Verifica firma y vencimiento.
 *
 * @throws {HTTPException} 401 si el token no sirve.
 */
export function verifyPublicSessionToken(token: string): Principal {
  if (!isPublicSessionToken(token)) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
  const rest = token.slice(PREFIX.length);
  const dot = rest.lastIndexOf('.');
  if (dot <= 0) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
  const body = rest.slice(0, dot);
  const sig = rest.slice(dot + 1);
  const expected = signBody(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
  const payload = asPayload(parsed);
  if (!payload || payload.exp < Date.now()) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
  return {
    userId: payload.sub,
    tenantId: PUBLIC_TENANT_ID,
    profileType: PUBLIC_PROFILE,
    email: null,
    name: 'Landing',
  };
}
