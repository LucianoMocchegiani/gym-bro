import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gymbroGet } from '../gymbro-client.js';
import { suggestNavLinks } from '../nav-map.js';
import { asArray, asRecord, toolFromGymbro } from '../slim.js';

/**
 * Sugiere rutas del Admin según permisos efectivos del staff (`GET /api/me/permissions`).
 */
export function registerNavTools(server: McpServer): void {
  server.registerTool(
    'suggest_nav',
    {
      title: 'Sugerir pantalla Admin',
      description:
        'Devuelve hrefs del panel Admin que este staff puede ver. query es texto libre (caja, puerta, afiliados, reportes…). No navega sola: devolvé los links al usuario.',
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe('Qué pantalla busca el staff. Vacío lista las visibles.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query }) =>
      toolFromGymbro(async () => {
        const raw = await gymbroGet('/api/me/permissions');
        const body = asRecord(raw) ?? {};
        const codes = asArray(body.permissionCodes).filter(
          (item): item is string => typeof item === 'string',
        );
        return {
          links: suggestNavLinks(query ?? '', codes),
        };
      }),
  );
}
