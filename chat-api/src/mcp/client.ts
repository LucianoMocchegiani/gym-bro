import { createMCPClient, type MCPClient } from '@ai-sdk/mcp';
import { config } from '../config.js';

/**
 * `_meta` de un tool MCP que solo se ejecuta por un acto del usuario (botón), nunca por el modelo.
 */
export const USER_ONLY_META_KEY = 'chat/userOnly';

/**
 * Cliente MCP de esta instancia. El Bearer es el del staff del request (no uno fijo).
 */
export async function openMcpClient(accessToken: string): Promise<MCPClient> {
  return createMCPClient({
    transport: {
      type: 'http',
      url: config.chatMcpUrl,
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    clientName: 'chat-api',
  });
}

export function isUserOnlyTool(tool: unknown): boolean {
  if (typeof tool !== 'object' || tool === null) {
    return false;
  }
  const meta = (tool as { _meta?: Record<string, unknown> })._meta;
  return meta?.[USER_ONLY_META_KEY] === true;
}

/**
 * Tools que puede llamar el modelo: saca los `userOnly`.
 */
export function modelTools<T extends Record<string, unknown>>(listed: T): T {
  const picked: Record<string, unknown> = {};
  for (const [name, tool] of Object.entries(listed)) {
    if (!isUserOnlyTool(tool)) {
      picked[name] = tool;
    }
  }
  return picked as T;
}
