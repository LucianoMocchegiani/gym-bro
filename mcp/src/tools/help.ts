import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { jsonResult } from '../slim.js';

const TOPICS = [
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
 * Artículos cortos en `mcp/help/`. Cualquier Staff. No es el C-producto.
 */
export function registerHelpTools(server: McpServer): void {
  server.registerTool(
    'get_help',
    {
      title: 'Ayuda GymBro',
      description:
        'Artículo corto de cómo usar el Admin (español, una pantalla). topic: afiliados, packs, sesiones, puerta, caja, debito, devoluciones, reportes, roles, chat. Sin topic lista los temas. No cobra ni edita.',
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
