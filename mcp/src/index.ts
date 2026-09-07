import { randomUUID } from 'node:crypto';
import { serve } from '@hono/node-server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { Hono } from 'hono';
import { config } from './config.js';
import { pingGymbro } from './gymbro-client.js';
import { requestBearer } from './request-auth.js';
import { createGymbroMcpServer } from './server.js';

type McpSession = {
  transport: WebStandardStreamableHTTPServerTransport;
  server: McpServer;
};

const sessions = new Map<string, McpSession>();

function extractBearer(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  const match = /^Bearer\s+(\S+)/i.exec(header.trim());
  return match?.[1] ?? null;
}

function isInitializeRequest(body: unknown): boolean {
  if (Array.isArray(body)) {
    return body.some((item) => isInitializeRequest(item));
  }
  if (typeof body !== 'object' || body === null) {
    return false;
  }
  return (body as { method?: string }).method === 'initialize';
}

function unauthorized(): Response {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

function jsonRpcError(status: number, message: string): Response {
  return Response.json(
    {
      jsonrpc: '2.0',
      error: { code: -32000, message },
      id: null,
    },
    { status },
  );
}

/**
 * App HTTP del sidecar MCP: `/health` público, `/mcp` Streamable HTTP con Bearer.
 */
export function createApp(): Hono {
  const app = new Hono();

  app.get('/health', async (c) => {
    const gymbro = await pingGymbro();
    return c.json({
      status: 'ok',
      gymbro,
      checkedAt: new Date().toISOString(),
    });
  });

  app.all('/mcp', async (c) => {
    const token = extractBearer(c.req.header('Authorization'));
    if (!token) {
      return unauthorized();
    }

    let parsedBody: unknown;
    if (c.req.method === 'POST') {
      try {
        parsedBody = await c.req.json();
      } catch {
        return jsonRpcError(400, 'Invalid JSON body');
      }
    }

    const sessionHeader = c.req.header('mcp-session-id')?.trim();
    const existing = sessionHeader ? sessions.get(sessionHeader) : undefined;

    const authInfo = { token, clientId: 'staff', scopes: [] as string[] };

    const run = (transport: WebStandardStreamableHTTPServerTransport) =>
      requestBearer.run(token, () =>
        transport.handleRequest(c.req.raw, {
          parsedBody,
          authInfo,
        }),
      );

    if (existing) {
      return run(existing.transport);
    }

    if (c.req.method === 'POST' && !sessionHeader && isInitializeRequest(parsedBody)) {
      const holder: Partial<McpSession> = {};
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
        onsessioninitialized: (sessionId) => {
          if (holder.transport && holder.server) {
            sessions.set(sessionId, {
              transport: holder.transport,
              server: holder.server,
            });
          }
        },
        onsessionclosed: (sessionId) => {
          const session = sessions.get(sessionId);
          sessions.delete(sessionId);
          void session?.server.close();
        },
      });
      const server = createGymbroMcpServer();
      holder.transport = transport;
      holder.server = server;
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) {
          sessions.delete(sid);
        }
      };
      await server.connect(transport);
      return run(transport);
    }

    if (sessionHeader) {
      return jsonRpcError(404, 'Unknown MCP session');
    }
    return jsonRpcError(400, 'Bad Request: No valid session ID provided');
  });

  return app;
}

const app = createApp();

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`gymbro-mcp listening on :${info.port}`);
});
