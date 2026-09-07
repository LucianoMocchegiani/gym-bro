import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { sessionsRange } from '../dates.js';
import { gymbroGet } from '../gymbro-client.js';
import {
  asArray,
  asRecord,
  compact,
  pickNumber,
  pickString,
  take,
  toolFromGymbro,
} from '../slim.js';

const LIST_SIZE = 15;

function slimSession(value: unknown): Record<string, unknown> | null {
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
    serviceName: pickString(row, 'serviceName'),
    branchName: pickString(row, 'branchName'),
    instructorName: pickString(row, 'instructorName'),
    startsAt: row.startsAt ?? null,
    endsAt: row.endsAt ?? null,
    capacity: pickNumber(row, 'capacity'),
    bookedCount: pickNumber(row, 'bookedCount'),
    status: pickString(row, 'status'),
  };
}

/**
 * Tools de calendario (lectura). Nest exige `sessions.write` también en GET.
 */
export function registerSessionTools(server: McpServer): void {
  server.registerTool(
    'list_sessions',
    {
      title: 'Listar sesiones',
      description:
        'Clases en un rango. Sin from/to usa el día de hoy en zona Buenos Aires. Máx. 15 filas. Requiere permiso de sesiones.',
      inputSchema: {
        from: z
          .string()
          .optional()
          .describe('Inicio: YYYY-MM-DD (día BA) o ISO datetime'),
        to: z
          .string()
          .optional()
          .describe('Fin: YYYY-MM-DD (día BA) o ISO datetime'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ from, to }) =>
      toolFromGymbro(async () => {
        const range = sessionsRange(from?.trim() || undefined, to?.trim() || undefined);
        const raw = await gymbroGet('/api/sessions', {
          from: range.from,
          to: range.to,
          pageSize: LIST_SIZE,
          page: 1,
          orderBy: 'startsAt',
          order: 'asc',
        });
        const body = asRecord(raw) ?? {};
        const items = take(compact(asArray(body.items).map(slimSession)), LIST_SIZE);
        return {
          from: range.from,
          to: range.to,
          items,
          total: typeof body.total === 'number' ? body.total : items.length,
          links: [{ href: '/sesiones', label: 'Sesiones' }],
        };
      }),
  );

  server.registerTool(
    'get_session',
    {
      title: 'Detalle de sesión',
      description:
        'Cupo y horario de una clase. Pasá el id de list_sessions. No reserva ni cancela.',
      inputSchema: {
        sessionId: z.string().uuid().describe('UUID de la sesión'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ sessionId }) =>
      toolFromGymbro(async () => {
        const raw = await gymbroGet(`/api/sessions/${sessionId}`);
        const slim = slimSession(raw);
        return {
          ...slim,
          links: [{ href: '/sesiones', label: 'Sesiones' }],
        };
      }),
  );
}
