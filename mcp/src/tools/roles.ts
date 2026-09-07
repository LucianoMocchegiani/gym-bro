import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gymbroGet } from '../gymbro-client.js';
import {
  asArray,
  asRecord,
  compact,
  pickBool,
  pickString,
  take,
  toolFromGymbro,
} from '../slim.js';

function slimRole(value: unknown): Record<string, unknown> | null {
  const row = asRecord(value);
  if (!row) {
    return null;
  }
  const id = pickString(row, 'id');
  if (!id) {
    return null;
  }
  const codes = asArray(row.permissionCodes).filter(
    (item): item is string => typeof item === 'string',
  );
  return {
    id,
    name: pickString(row, 'name'),
    slug: pickString(row, 'slug'),
    isSystem: pickBool(row, 'isSystem'),
    permissionCodes: take(codes, 40),
  };
}

/**
 * Roles (lectura). Nest: `roles.write`.
 */
export function registerRoleTools(server: McpServer): void {
  server.registerTool(
    'list_roles',
    {
      title: 'Listar roles',
      description:
        'Roles del gym (nombre, slug, códigos de permiso). No crea ni edita. Requiere permiso de roles.',
      inputSchema: {
        q: z.string().optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ q }) =>
      toolFromGymbro(async () => {
        const raw = await gymbroGet('/api/roles', {
          q: q?.trim() || undefined,
          page: 1,
          pageSize: 20,
        });
        const body = asRecord(raw) ?? {};
        const items = take(compact(asArray(body.items).map(slimRole)), 20);
        return {
          items,
          total: typeof body.total === 'number' ? body.total : items.length,
          links: [{ href: '/roles', label: 'Roles y permisos' }],
        };
      }),
  );

  server.registerTool(
    'get_role',
    {
      title: 'Detalle de rol',
      description: 'Un rol por id. Usá el id de list_roles. No edita permisos.',
      inputSchema: {
        roleId: z.string().uuid().describe('UUID del rol'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ roleId }) =>
      toolFromGymbro(async () => {
        const raw = await gymbroGet(`/api/roles/${roleId}`);
        return {
          role: slimRole(raw),
          links: [{ href: '/roles', label: 'Roles y permisos' }],
        };
      }),
  );
}
