import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gymbroGet } from '../gymbro-client.js';
import { asRecord, toolFromGymbro } from '../slim.js';

/**
 * Preview de ingreso (C0): mismas RN que la puerta, sin `access_attempts`.
 */
export function registerAccessTools(server: McpServer): void {
  server.registerTool(
    'preview_member_access',
    {
      title: '¿Puede entrar?',
      description:
        'Simula si el afiliado podría ingresar ahora (mismas reglas que la puerta). No registra intento ni marca asistencia. Pasá memberId de search_members.',
      inputSchema: {
        memberId: z.string().uuid().describe('UUID del afiliado'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ memberId }) =>
      toolFromGymbro(async () => {
        const raw = await gymbroGet(`/api/members/${memberId}/access-preview`);
        const body = asRecord(raw) ?? {};
        return {
          allowed: body.allowed === true,
          reasonCode: body.reasonCode ?? null,
          reasonLabel: body.reasonLabel ?? null,
          memberId: body.memberId ?? memberId,
          reservationId: body.reservationId ?? null,
          sessionId: body.sessionId ?? null,
          overdueDays: body.overdueDays ?? null,
          debtToleranceDays: body.debtToleranceDays ?? null,
          links: [{ href: '/puerta', label: 'Puerta' }],
        };
      }),
  );
}
