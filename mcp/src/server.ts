import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAccessTools } from './tools/access.js';
import { registerMemberTools } from './tools/members.js';
import { registerNavTools } from './tools/nav.js';
import { registerRegisterTools } from './tools/register.js';
import { registerSessionTools } from './tools/sessions.js';

/**
 * Servidor MCP GymBro: tools A (operación). Sin writes. El Bearer vive en ALS del request HTTP.
 */
export function createGymbroMcpServer(): McpServer {
  const server = new McpServer({
    name: 'gymbro-mcp',
    version: '0.0.1',
  });
  registerMemberTools(server);
  registerAccessTools(server);
  registerSessionTools(server);
  registerRegisterTools(server);
  registerNavTools(server);
  return server;
}
