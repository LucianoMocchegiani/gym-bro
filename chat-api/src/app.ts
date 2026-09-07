import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './config.js';
import { prisma } from './prisma.js';

type DatabaseStatus = 'up' | 'down';

/**
 * App HTTP del chat-api. C1: CORS + `GET /health`. Rutas de hilos = C2.
 */
export function createApp(): Hono {
  const app = new Hono();

  app.use(
    '*',
    cors({
      origin: config.corsOrigins,
      allowHeaders: ['Authorization', 'Content-Type'],
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );

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

  return app;
}
