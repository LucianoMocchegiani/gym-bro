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
        'Artículo de cómo funciona Faciliter (español). topic: producto (visión), guia (pantallas; fotos en /docs), afiliados, packs, sesiones, puerta, caja, vencimientos, debito, mercadopago (configuración MP completa: app, Config, URL webhook, cuatro topics, checklist, errores; alias mp), devoluciones, reportes, roles, chat, soporte (contacto si hay un problema). Sin topic lista los temas. Si reportan un error, bug o piden ayuda humana, usá soporte. Para “dónde queda / cómo se ve / qué ve el socio”, usá guia. Para “cómo conectar / configurar Mercado Pago / webhooks / token / topics”, usá mercadopago y **reproducí el artículo entero** (pasos 1–6 + tabla de topics); no lo reduzcas a una sola URL. No cobra ni edita.',
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
      const resolved =
        key === 'mp' ? 'mercadopago' : key;
      if (!key) {
        return jsonResult({
          topics: [...TOPICS],
          hint: 'Pasá topic con uno de esos valores (mp = mercadopago).',
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
