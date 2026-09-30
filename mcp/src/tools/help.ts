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
  'vencimientos',
  'debito',
  'mercadopago',
  'carpeta',
  'devoluciones',
  'reportes',
  'roles',
  'chat',
  'soporte',
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
        'Artículo de cómo funciona Faciliter (español). topic: producto, guia, afiliados, packs, sesiones, puerta, caja, vencimientos, debito, mercadopago (MP completo; alias mp), carpeta (notas y PDF/imagen de socio y staff; aliases documentos, folder, rutina, rutinas), devoluciones, reportes, roles, chat, soporte. Sin topic lista los temas. Error/bug/humano → soporte. Pantallas → guia. MP → mercadopago y el artículo entero. Carpeta / rutina como archivo / documentos del socio → carpeta y explicá panel (ícono), etiquetas del gym, app Mis documentos, que no hay módulo de rutinas por días. No cobra ni edita.',
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
      const aliases: Record<string, HelpTopic> = {
        mp: 'mercadopago',
        documentos: 'carpeta',
        folder: 'carpeta',
        rutina: 'carpeta',
        rutinas: 'carpeta',
      };
      const resolved = key ? (aliases[key] ?? key) : key;
      if (!key) {
        return jsonResult({
          topics: [...TOPICS],
          hint: 'Pasá topic con uno de esos valores (mp = mercadopago; documentos/folder/rutina = carpeta).',
        });
      }
      if (!resolved || !isTopic(resolved)) {
        return jsonResult({
          error: 'topic desconocido',
          topics: [...TOPICS],
        });
      }
      try {
        const markdown = await readFile(join(helpDir(), `${resolved}.md`), 'utf8');
        return jsonResult({
          topic: resolved,
          markdown: markdown.trim(),
        });
      } catch {
        console.error(`help missing: ${resolved}`);
        return jsonResult({
          error: 'artículo no disponible',
          topics: [...TOPICS],
        });
      }
    },
  );
}
