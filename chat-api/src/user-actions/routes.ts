import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { shrinkToolContent } from '../agent/window.js';
import { isPublicPrincipal, type AppEnv } from '../auth/principal.js';
import { requireConversationId } from '../conversations/ids.js';
import { getConversation } from '../conversations/service.js';
import { isUserOnlyTool, openMcpClient } from '../mcp/client.js';
import { insertToolMessage, toJsonValue, toMessageDto, touchConversation } from '../messages/persist.js';

const TOOL_NAME = /^[A-Za-z0-9_.-]{1,64}$/;

type UserAction = { tool: string; input: Record<string, unknown> };

async function readAction(c: { req: { text: () => Promise<string> } }): Promise<UserAction> {
  const text = await c.req.text();
  let body: unknown;
  try {
    body = JSON.parse(text || '{}') as unknown;
  } catch {
    throw new HTTPException(400, { message: 'Invalid JSON' });
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new HTTPException(400, { message: 'Body must be a JSON object' });
  }
  const { tool, input } = body as { tool?: unknown; input?: unknown };
  if (typeof tool !== 'string' || !TOOL_NAME.test(tool)) {
    throw new HTTPException(400, { message: 'tool is required' });
  }
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new HTTPException(400, { message: 'input must be an object' });
  }
  return { tool, input: input as Record<string, unknown> };
}

/**
 * Acto del usuario (botón de una tarjeta): ejecuta un tool MCP marcado `chat/userOnly`.
 *
 * @remarks El modelo nunca recibe esos tools. Se guarda como fila `tool` del hilo para el
 * siguiente turno. Landing pública: 403.
 */
export const userActionRoutes = new Hono<AppEnv>();

userActionRoutes.post('/', async (c) => {
  const principal = c.get('principal');
  if (isPublicPrincipal(principal)) {
    throw new HTTPException(403, { message: 'Not allowed' });
  }
  const id = requireConversationId(c.req.param('id'));
  const conversation = await getConversation(principal, id);
  if (conversation.archivedAt) {
    throw new HTTPException(409, { message: 'Conversation archived' });
  }
  const action = await readAction(c);

  let mcp;
  try {
    mcp = await openMcpClient(c.get('accessToken'));
  } catch (error) {
    console.error(error);
    throw new HTTPException(502, { message: 'El asistente no puede consultar los datos del gym.' });
  }
  try {
    const listed = (await mcp.tools()) as Record<string, unknown>;
    const tool = listed[action.tool];
    if (!tool || !isUserOnlyTool(tool)) {
      throw new HTTPException(400, { message: 'Acción no permitida' });
    }
    const execute = (tool as { execute: (input: unknown, options: unknown) => Promise<unknown> })
      .execute;
    const output = await execute(action.input, { toolCallId: randomUUID(), messages: [] });
    const row = await insertToolMessage({
      conversationId: id,
      toolName: action.tool,
      toolArgs: toJsonValue(action.input),
      toolResult: toJsonValue(output),
      content: shrinkToolContent(action.tool, output, true),
    });
    await touchConversation(id);
    return c.json({ message: toMessageDto(row), output });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error(error);
    throw new HTTPException(502, { message: 'El asistente no puede consultar los datos del gym.' });
  } finally {
    await mcp.close().catch(() => undefined);
  }
});
