import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAccessTools } from './tools/access.js';
import { registerAuditTools } from './tools/audit.js';
import { registerCatalogTools } from './tools/catalog.js';
import { registerDebitTools } from './tools/debit.js';
import { registerHelpTools } from './tools/help.js';
import { registerMemberTools } from './tools/members.js';
import { registerNavTools } from './tools/nav.js';
import { registerRefundTools } from './tools/refunds.js';
import { registerRegisterTools } from './tools/register.js';
import { registerReportsTools } from './tools/reports.js';
import { registerRoleTools } from './tools/roles.js';
import { registerSessionTools } from './tools/sessions.js';

/**
 * Servidor MCP GymBro: tools A–D (lectura). Sin writes. El Bearer vive en ALS del request HTTP.
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
  registerReportsTools(server);
  registerRefundTools(server);
  registerDebitTools(server);
  registerCatalogTools(server);
  registerRoleTools(server);
  registerAuditTools(server);
  registerHelpTools(server);
  return server;
}
