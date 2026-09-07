import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { prisma } from '../prisma.js';
import type { AppEnv } from './principal.js';
import { resolvePrincipal } from './introspect.js';

function readBearer(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  const match = /^Bearer\s+(\S+)/i.exec(header.trim());
  return match?.[1] ?? null;
}

/**
 * Exige Bearer, introspecta y adjunta `principal`. Actualiza `identities`.
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

  const principal = await resolvePrincipal(token);
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
  await next();
});
