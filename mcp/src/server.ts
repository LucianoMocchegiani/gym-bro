import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAccessTools } from './tools/access.js';
import { registerAuditTools } from './tools/audit.js';
import { registerCatalogTools } from './tools/catalog.js';
import { registerConfirmTools } from './tools/confirm.js';
import { registerDebitTools } from './tools/debit.js';
import { registerExpenseTools } from './tools/expenses.js';
import { registerHelpTools } from './tools/help.js';
import { assistantWriteInstructions, registerLimitsTools } from './tools/limits.js';
import { registerMemberTools } from './tools/members.js';
import { registerNavTools } from './tools/nav.js';
import { registerRefundTools } from './tools/refunds.js';
import { registerRegisterTools } from './tools/register.js';
import { registerReportsTools } from './tools/reports.js';
import { registerRoleTools } from './tools/roles.js';
import { registerSessionTools } from './tools/sessions.js';
import { registerCatalogWriteTools } from './tools/write-catalog.js';
import { registerExpenseWriteTools } from './tools/write-expenses.js';
import { registerMemberWriteTools } from './tools/write-members.js';
import { registerReservationWriteTools } from './tools/write-reservations.js';
import { registerSessionWriteTools } from './tools/write-sessions.js';
import { registerStaffWriteTools } from './tools/write-staff.js';

/**
 * Servidor MCP GymBro: lectura A–D + propuestas de escritura (`propose_*`).
 *
 * @remarks Ningún tool visible al modelo escribe: solo `confirm_proposal` (userOnly) ejecuta,
 * ante el clic del usuario. El Bearer vive en ALS del request HTTP.
 */
export function createGymbroMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: 'gymbro-mcp',
      version: '0.1.0',
    },
    { instructions: assistantWriteInstructions() },
  );
  registerMemberTools(server);
  registerAccessTools(server);
  registerSessionTools(server);
  registerRegisterTools(server);
  registerNavTools(server);
  registerReportsTools(server);
  registerExpenseTools(server);
  registerRefundTools(server);
  registerDebitTools(server);
  registerCatalogTools(server);
  registerRoleTools(server);
  registerAuditTools(server);
  registerHelpTools(server);
  registerLimitsTools(server);
  registerExpenseWriteTools(server);
  registerMemberWriteTools(server);
  registerCatalogWriteTools(server);
  registerSessionWriteTools(server);
  registerReservationWriteTools(server);
  registerStaffWriteTools(server);
  registerConfirmTools(server);
  return server;
}
