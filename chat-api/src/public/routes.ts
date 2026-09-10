import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { prisma } from '../prisma.js';
import { config } from '../config.js';
import {
  issuePublicSessionToken,
  verifyPublicSessionToken,
} from '../auth/public-session.js';
import { createConversation } from '../conversations/service.js';
import { clientIp, consumeRateLimit } from './rate-limit.js';

/**
 * Alta de sesión anónima para la landing. Sin JWT Staff. Sin tools de gym.
 */
export const publicRoutes = new Hono();

publicRoutes.post('/session', async (c) => {
  if (!config.chatPublicEnabled) {
    throw new HTTPException(503, {
      message: 'El asistente de la landing no está habilitado.',
    });
  }
  const ip = clientIp(c.req.raw.headers);
  if (!consumeRateLimit(`public-session:${ip}`, 12)) {
    throw new HTTPException(429, {
      message:
        'Llegaste al tope de consultas por ahora. Probá más tarde o agendá una reunión.',
    });
  }

  const token = issuePublicSessionToken();
  const principal = verifyPublicSessionToken(token);
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
      name: principal.name,
      lastSeenAt: new Date(),
    },
  });
  const conversation = await createConversation(principal, null);
  return c.json({ token, conversation }, 201);
});
