import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { prisma } from '../prisma.js';
import { config } from '../config.js';
import type { AppEnv } from './principal.js';
import { resolvePrincipal } from './introspect.js';
import {
  isPublicSessionToken,
  verifyPublicSessionToken,
} from './public-session.js';

function readBearer(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  const match = /^Bearer\s+(\S+)/i.exec(header.trim());
  return match?.[1] ?? null;
}

/**
 * Exige Bearer, resuelve principal (Staff via Nest o sesión landing) y actualiza `identities`.
 */
export const requirePrincipal = createMiddleware<AppEnv>(async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    await next();
    return;
  }
  const token = readBearer(c.req.header('Authorization'));
  if (!token) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  const principal = isPublicSessionToken(token)
    ? (() => {
        if (!config.chatPublicEnabled) {
          throw new HTTPException(503, {
            message: 'El asistente de la landing no está habilitado.',
          });
        }
        return verifyPublicSessionToken(token);
      })()
    : await resolvePrincipal(token);

  await prisma.identity.upsert({
    where: {
      tenantId_userId: {
        tenantId: principal.tenantId,
        userId: principal.userId,
      },
    },
    create: {
      tenantId: principal.tenantId,
      userId: principal.userId,
      email: principal.email,
      name: principal.name,
      lastSeenAt: new Date(),
    },
    update: {
      email: principal.email,
      name: principal.name,
      lastSeenAt: new Date(),
    },
  });

  c.set('principal', principal);
  c.set('accessToken', token);
  await next();
});
