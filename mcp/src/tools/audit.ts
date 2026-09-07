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

function slimAudit(value: unknown): Record<string, unknown> | null {
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
    action: pickString(row, 'action'),
    entityType: pickString(row, 'entityType'),
    entityId: pickString(row, 'entityId'),
    actorId: pickString(row, 'actorId'),
    createdAt: row.createdAt ?? null,
  };
}

/**
 * Auditoría slim (sin before/after). Nest: `audit.read`.
 */
export function registerAuditTools(server: McpServer): void {
  server.registerTool(
    'search_audit_events',
    {
      title: 'Buscar auditoría',
      description:
        'Eventos de auditoría recortados (acción, entidad, actor, fecha). Sin JSON before/after. q busca en action. No edita.',
      inputSchema: {
        q: z
          .string()
          .optional()
          .describe('Texto sobre el código de acción (ej. contract, member).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ q }) =>
      toolFromGymbro(async () => {
        const raw = await gymbroGet('/api/audit-events', {
          q: q?.trim() || undefined,
          page: 1,
          pageSize: 15,
        });
        const body = asRecord(raw) ?? {};
        const items = take(compact(asArray(body.items).map(slimAudit)), 15);
        return {
          items,
          total: typeof body.total === 'number' ? body.total : items.length,
          links: [{ href: '/auditoria', label: 'Auditoría' }],
        };
      }),
  );
}
