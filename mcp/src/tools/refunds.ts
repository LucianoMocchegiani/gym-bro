import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gymbroGet } from '../gymbro-client.js';
import {
  asArray,
  asRecord,
  compact,
  pickString,
  take,
  toolFromGymbro,
} from '../slim.js';

function slimRefund(value: unknown): Record<string, unknown> | null {
  const row = asRecord(value);
  if (!row) {
    return null;
  }
  const id = pickString(row, 'id');
  if (!id) {
    return null;
  }
  return {
    id,
    memberId: pickString(row, 'memberId'),
    transactionItemId: pickString(row, 'transactionItemId'),
    status: pickString(row, 'status'),
    createdAt: row.createdAt ?? null,
  };
}

/**
 * Solicitudes de devolución (lectura). Nest: `transaction_items.refund`.
 */
export function registerRefundTools(server: McpServer): void {
  server.registerTool(
    'list_refund_requests',
    {
      title: 'Solicitudes de devolución',
      description:
        'Lista solicitudes de devolución del gym (recortadas). No ejecuta el reembolso. Requiere permiso de devoluciones.',
      inputSchema: {
        status: z
          .enum(['PENDING', 'REJECTED', 'EXECUTED'])
          .optional()
          .describe('Filtro de estado. Vacío = todas.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ status }) =>
      toolFromGymbro(async () => {
        const raw = await gymbroGet('/api/refund-requests', {
          page: 1,
          pageSize: 15,
          status,
        });
        const body = asRecord(raw) ?? {};
        const items = take(compact(asArray(body.items).map(slimRefund)), 15);
        return {
          items,
          total: typeof body.total === 'number' ? body.total : items.length,
          links: [{ href: '/devoluciones', label: 'Devoluciones' }],
        };
      }),
  );
}
