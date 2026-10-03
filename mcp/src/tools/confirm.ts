import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { GymbroApiError, gymbroSend } from '../gymbro-client.js';
import { CONFIRM_TOOL, ownerOf, takeProposal, USER_ONLY_META } from '../proposals.js';
import { getBearer } from '../request-auth.js';
import { jsonResult } from '../slim.js';

function failureText(error: unknown): string {
  if (error instanceof GymbroApiError) {
    if (error.status === 401) {
      return 'Sesión vencida. Volvé a entrar al Admin.';
    }
    if (error.status === 403) {
      return 'No tenés permiso para hacer esto.';
    }
    if (error.status === 404) {
      return 'Ya no existe lo que se iba a modificar.';
    }
    const message = error.apiMessage;
    if (message && error.status < 500) {
      return message;
    }
  }
  return 'GymBro no respondió. No se hizo nada; probá de nuevo.';
}

/**
 * Ejecuta o descarta una propuesta. Solo la llama el chat ante el clic del usuario
 * (`_meta` `chat/userOnly`): el modelo no la ve (RN-ASI-001).
 */
export function registerConfirmTools(server: McpServer): void {
  server.registerTool(
    CONFIRM_TOOL,
    {
      title: 'Confirmar propuesta',
      description:
        'Solo para el botón de la tarjeta (acto del usuario). Ejecuta o cancela una propuesta de un solo uso.',
      inputSchema: {
        proposalId: z.string().uuid(),
        decision: z.enum(['confirm', 'cancel']),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      _meta: USER_ONLY_META,
    },
    async ({ proposalId, decision }) => {
      const taken = takeProposal(proposalId, ownerOf(getBearer()));
      if (!taken.ok) {
        return jsonResult({
          status: 'expired',
          proposalId,
          message: 'La propuesta venció (2 minutos) o ya se usó. No se hizo nada; pedila de nuevo.',
        });
      }
      const { proposal } = taken;
      if (decision === 'cancel') {
        return jsonResult({
          status: 'cancelled',
          proposalId,
          title: proposal.title,
          message: 'Cancelado. No se hizo nada.',
        });
      }
      try {
        await gymbroSend(proposal.request.method, proposal.request.path, proposal.request.body);
        return jsonResult({
          status: 'done',
          proposalId,
          title: proposal.title,
          message: proposal.doneText,
          links: proposal.links,
        });
      } catch (error) {
        if (!(error instanceof GymbroApiError)) {
          console.error(error);
        }
        return jsonResult({
          status: 'failed',
          proposalId,
          title: proposal.title,
          message: failureText(error),
          links: proposal.links,
        });
      }
    },
  );
}
