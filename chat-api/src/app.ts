import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { requirePrincipal } from './auth/middleware.js';
import type { AppEnv } from './auth/principal.js';
import { config } from './config.js';
import { allowCorsOrigin } from './cors.js';
import { conversationRoutes } from './conversations/routes.js';
import { messageRoutes } from './messages/routes.js';
import { prisma } from './prisma.js';

type DatabaseStatus = 'up' | 'down';

/**
 * App HTTP del chat-api: CORS, health público, `/v1` autenticado.
 */
export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use(
    '*',
    cors({
      origin: (origin) =>
        origin
          ? allowCorsOrigin(origin, config.corsOrigins, config.corsAppDomain)
          : '*',
      allowHeaders: [
        'Authorization',
        'Content-Type',
        'x-vercel-ai-ui-message-stream',
      ],
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      const status = err.status as 400 | 401 | 403 | 404 | 502 | 500;
      return c.json({ error: err.message }, status);
    }
    console.error(err);
    return c.json({ error: 'Internal Server Error' }, 500);
  });

  /**
   * Probe de proceso + ping a la database `chat`.
   */
  app.get('/health', async (c) => {
    let database: DatabaseStatus = 'down';
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }

    return c.json(
      {
        status: database === 'up' ? 'ok' : 'degraded',
        database,
        checkedAt: new Date().toISOString(),
      },
      database === 'up' ? 200 : 503,
    );
  });

  const v1 = new Hono<AppEnv>();
  v1.use('*', requirePrincipal);
  v1.route('/conversations/:id/messages', messageRoutes);
  v1.route('/conversations', conversationRoutes);
  app.route('/v1', v1);

  return app;
}
