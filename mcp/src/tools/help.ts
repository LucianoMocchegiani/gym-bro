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
  'migracion',
  'packs',
  'sesiones',
  'puerta',
  'caja',
  'vencimientos',
  'debito',
  'mercadopago',
  'carpeta',
  'devoluciones',
  'gastos',
  'reportes',
  'roles',
  'avisos',
  'app',
  'cuenta',
  'plan',
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
        'Artículo de cómo funciona Faciliter (español). topic: producto, guia, afiliados, migracion (importar socios desde Excel/CSV + zip de fotos y carpeta, contraseña temporal ChangeMe123!; aliases importar, importacion, migrar, excel, planilla), packs (incluye tener en cuenta la comisión de MP al poner precios), sesiones, puerta (QR con la app; ZKTeco opcional, se coordina con técnicos; aliases zkteco, molinete, acceso), caja (efectivo, transferencia, link MP y descuento por pago sin comisión, default 7,6 %; aliases transferencia, descuento), vencimientos, debito, mercadopago (MP completo, comisiones por plazo y cómo poner la plata al instante con links oficiales; aliases mp, comision), carpeta (notas y PDF/imagen de socio y staff; aliases documentos, folder, rutina, rutinas), devoluciones, gastos (egresos del gym, etiquetas, comprobantes, efectivo resta en el Cierre; alias egresos), reportes, roles, avisos (plantillas del gym y bandeja del socio, sin push; aliases notificaciones, mails, bandeja), app (recorrido de la app del socio y staff; aliases aplicacion, celular), cuenta (cuenta Faciliter, login, contraseña, Tus gyms, Mi cuenta, eliminar cuenta; aliases login, contraseña, password, eliminar), plan (contratar Faciliter, /empezar, prueba, Plan / Uso, renovación, gracia; aliases contratar, suscripcion, empezar, precio, precios), chat, soporte. Sin topic lista los temas. Error/bug/humano → soporte. Pantallas → guia. MP → mercadopago y el artículo entero. Carpeta / rutina como archivo / documentos del socio → carpeta y explicá panel (ícono), etiquetas del gym, app Inicio → Documentos, que no hay módulo de rutinas por días. No cobra ni edita.',
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
        comision: 'mercadopago',
        comisiones: 'mercadopago',
        transferencia: 'caja',
        descuento: 'caja',
        descuentos: 'caja',
        documentos: 'carpeta',
        folder: 'carpeta',
        rutina: 'carpeta',
        rutinas: 'carpeta',
        importar: 'migracion',
        importacion: 'migracion',
        migrar: 'migracion',
        excel: 'migracion',
        planilla: 'migracion',
        egresos: 'gastos',
        gasto: 'gastos',
        zkteco: 'puerta',
        molinete: 'puerta',
        acceso: 'puerta',
        notificaciones: 'avisos',
        mails: 'avisos',
        bandeja: 'avisos',
        aplicacion: 'app',
        celular: 'app',
        login: 'cuenta',
        contraseña: 'cuenta',
        password: 'cuenta',
        eliminar: 'cuenta',
        contratar: 'plan',
        suscripcion: 'plan',
        empezar: 'plan',
        precio: 'plan',
        precios: 'plan',
      };
      const resolved = key ? (aliases[key] ?? key) : key;
      if (!key) {
        return jsonResult({
          topics: [...TOPICS],
          hint: 'Pasá topic con uno de esos valores (mp = mercadopago; documentos/folder/rutina = carpeta; importar/excel = migracion; login/contraseña = cuenta; contratar/suscripcion = plan; notificaciones = avisos; zkteco = puerta).',
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
