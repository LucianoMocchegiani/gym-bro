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

function slimMandate(value: unknown): Record<string, unknown> | null {
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
    memberName: pickString(row, 'memberName'),
    status: pickString(row, 'status'),
    packName: pickString(row, 'packName'),
    nextChargeOn: pickString(row, 'nextChargeOn') ?? row.nextChargeOn ?? null,
  };
}

/**
 * Mandatos de débito (lectura). Nest: `cashier.operate`.
 */
export function registerDebitTools(server: McpServer): void {
  server.registerTool(
    'list_debit_mandates',
    {
      title: 'Mandatos de débito',
      description:
        'Lista mandatos de débito automático (recortados). No enrola ni cobra. Requiere permiso de caja.',
      inputSchema: {
        bucket: z
          .enum(['due', 'retrying', 'failed', 'all'])
          .optional()
          .describe('Cola de Caja. Default Nest si se omite.'),
        memberId: z.string().uuid().optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ bucket, memberId }) =>
      toolFromGymbro(async () => {
        const raw = await gymbroGet('/api/debit-mandates', {
          page: 1,
          pageSize: 15,
          bucket,
          memberId,
        });
        const body = asRecord(raw) ?? {};
        const items = take(compact(asArray(body.items).map(slimMandate)), 15);
        return {
          items,
          total: typeof body.total === 'number' ? body.total : items.length,
          links: [{ href: '/caja', label: 'Caja' }],
        };
      }),
  );
}
