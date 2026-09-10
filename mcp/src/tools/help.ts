import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { jsonResult } from '../slim.js';

const TOPICS = [
  'producto',
  'guia',
  'afiliados',
  'packs',
  'sesiones',
  'puerta',
  'caja',
  'debito',
  'devoluciones',
  'reportes',
  'roles',
  'chat',
] as const;

type HelpTopic = (typeof TOPICS)[number];

function helpDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'help');
}

function isTopic(value: string): value is HelpTopic {
  return (TOPICS as readonly string[]).includes(value);
}

/**
 * Artículos en `mcp/help/`. Staff y landing pública (solo este tool). No es el C-producto.
 */
export function registerHelpTools(server: McpServer): void {
  server.registerTool(
    'get_help',
    {
      title: 'Ayuda Faciliter',
      description:
        'Artículo de cómo funciona Faciliter (español). topic: producto (visión), guia (cómo se ven las pantallas del panel y la app; fotos en /docs), afiliados, packs, sesiones, puerta, caja, debito, devoluciones, reportes, roles, chat. Sin topic lista los temas. Para “dónde queda / cómo se ve / qué ve el socio”, usá guia. No cobra ni edita.',
      inputSchema: {
        topic: z
          .string()
          .optional()
          .describe('Tema fijo. Vacío lista los disponibles.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ topic }) => {
      const key = topic?.trim().toLowerCase();
      if (!key) {
        return jsonResult({
          topics: [...TOPICS],
          hint: 'Pasá topic con uno de esos valores.',
        });
      }
      if (!isTopic(key)) {
        return jsonResult({
          error: 'topic desconocido',
          topics: [...TOPICS],
        });
      }
      try {
        const markdown = await readFile(join(helpDir(), `${key}.md`), 'utf8');
        return jsonResult({
          topic: key,
          markdown: markdown.trim(),
        });
      } catch {
        console.error(`help missing: ${key}`);
        return jsonResult({
          error: 'artículo no disponible',
          topics: [...TOPICS],
        });
      }
    },
  );
}
