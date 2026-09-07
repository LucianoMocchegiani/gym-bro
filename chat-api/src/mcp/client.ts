import { createMCPClient, type MCPClient } from '@ai-sdk/mcp';
import { config } from '../config.js';

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
