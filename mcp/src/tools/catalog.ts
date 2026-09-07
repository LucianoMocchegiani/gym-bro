import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gymbroGet } from '../gymbro-client.js';
import {
  asArray,
  asRecord,
  compact,
  pickBool,
  pickNumber,
  pickString,
  take,
  toolFromGymbro,
} from '../slim.js';

function slimService(value: unknown): Record<string, unknown> | null {
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
    name: pickString(row, 'name'),
    type: pickString(row, 'type'),
    active: pickBool(row, 'active'),
    dropInPrice: pickNumber(row, 'dropInPrice'),
  };
}

function slimPack(value: unknown): Record<string, unknown> | null {
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
    name: pickString(row, 'name'),
    price: pickNumber(row, 'price'),
    billingPeriod: pickString(row, 'billingPeriod'),
    active: pickBool(row, 'active'),
    kind: pickString(row, 'kind'),
  };
}

/**
 * Catálogo (lectura). Nest: `catalog.write`.
 */
export function registerCatalogTools(server: McpServer): void {
  server.registerTool(
    'list_services',
    {
      title: 'Listar servicios',
      description:
        'Servicios del catálogo (id, nombre, tipo, activo). Sin editar. Requiere permiso de catálogo.',
      inputSchema: {
        q: z.string().optional().describe('Búsqueda por nombre.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ q }) =>
      toolFromGymbro(async () => {
        const raw = await gymbroGet('/api/services', {
          q: q?.trim() || undefined,
          page: 1,
          pageSize: 20,
        });
        const body = asRecord(raw) ?? {};
        const items = take(compact(asArray(body.items).map(slimService)), 20);
        return {
          items,
          total: typeof body.total === 'number' ? body.total : items.length,
          links: [{ href: '/servicios', label: 'Servicios' }],
        };
      }),
  );

  server.registerTool(
    'list_packs',
    {
      title: 'Listar packs',
      description:
        'Packs del catálogo (id, nombre, precio, activo). Sin metadata Kuatia ni editar.',
      inputSchema: {
        q: z.string().optional().describe('Búsqueda por nombre.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ q }) =>
      toolFromGymbro(async () => {
        const raw = await gymbroGet('/api/packs', {
          q: q?.trim() || undefined,
          page: 1,
          pageSize: 20,
        });
        const body = asRecord(raw) ?? {};
        const items = take(compact(asArray(body.items).map(slimPack)), 20);
        return {
          items,
          total: typeof body.total === 'number' ? body.total : items.length,
          links: [{ href: '/packs', label: 'Packs' }],
        };
      }),
  );

  server.registerTool(
    'get_pack',
    {
      title: 'Detalle de pack',
      description:
        'Un pack por id (precio, periodo, kind). Sin Kuatia. Usá el id de list_packs.',
      inputSchema: {
        packId: z.string().uuid().describe('UUID del pack'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ packId }) =>
      toolFromGymbro(async () => {
        const raw = await gymbroGet(`/api/packs/${packId}`);
        const pack = slimPack(raw);
        return {
          pack,
          links: [{ href: '/packs', label: 'Packs' }],
        };
      }),
  );
}
