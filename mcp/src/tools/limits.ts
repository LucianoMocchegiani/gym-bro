import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { jsonResult } from '../slim.js';

/** Lo que el asistente puede proponer (siempre con Confirmar del usuario). RN-ASI-002. */
export const ASSISTANT_CAN_WRITE = [
  'Gastos: cargar y editar (el comprobante se sube en Gastos).',
  'Afiliados: alta (contraseña temporal ChangeMe123!), editar ficha, cambiar estado (activo, suspendido, baja).',
  'Servicios y packs: crear y editar.',
  'Sesiones: crear una clase puntual o una serie semanal; editar horario, cupo o instructor.',
  'Reservas: reservar a un socio con crédito de su pack y anotarlo en lista de espera.',
  'Staff: alta (contraseña temporal), editar datos y asignar roles.',
  'Roles: crear y editar permisos.',
] as const;

/** Fuera por seguridad: se hace en el panel. RN-ASI-002. */
export const ASSISTANT_CANNOT_WRITE = [
  { action: 'Cobrar, caja, links o QR de Mercado Pago, reservas pagadas en el momento (drop-in)', href: '/caja', label: 'Caja' },
  { action: 'Devoluciones', href: '/devoluciones', label: 'Devoluciones' },
  { action: 'Débito automático (alta o baja)', href: '/caja', label: 'Caja' },
  { action: 'Pase manual o abrir la puerta', href: '/puerta', label: 'Puerta' },
  { action: 'Configuración del gym y Mercado Pago', href: '/config', label: 'Configuración' },
  { action: 'Borrar o cancelar (gastos, socios, servicios, packs, sesiones, series, reservas, staff, roles)', href: '/', label: 'Inicio' },
  { action: 'Subir archivos (comprobantes, fotos, documentos)', href: '/gastos', label: 'Gastos' },
] as const;

const SECURITY_REASON =
  'Por seguridad, eso no se hace desde el asistente: mueve plata, abre la puerta, toca la configuración o borra datos. Hacelo desde el panel.';

/**
 * Texto para el system prompt del chat (instrucciones MCP del servidor).
 */
export function assistantWriteInstructions(): string {
  return [
    'Escritura: nunca cambies nada directo. Usá las tools propose_* para armar una propuesta; el usuario la confirma con el botón de la tarjeta (vence en 2 minutos). Hasta que no veas confirm_proposal con status done, no digas que quedó hecho.',
    'Antes de proponer, buscá los ids con las tools de lectura (search_members, list_services, list_packs, list_sessions, search_staff, list_roles, list_expenses). No inventes ids ni montos: si falta un dato, preguntalo.',
    `Podés proponer: ${ASSISTANT_CAN_WRITE.join(' ')}`,
    `No podés (por seguridad): ${ASSISTANT_CANNOT_WRITE.map((item) => item.action).join('; ')}. Si te lo piden, llamá get_assistant_limits, decí que es por seguridad y pasá el link de la pantalla.`,
  ].join('\n');
}

/**
 * Qué puede y qué no puede escribir el asistente, con el motivo (seguridad) y la pantalla.
 */
export function registerLimitsTools(server: McpServer): void {
  server.registerTool(
    'get_assistant_limits',
    {
      title: 'Qué puede hacer el asistente',
      description:
        'Llamala cuando el usuario pida cobrar, devolver, débito, pase manual, abrir la puerta, configurar el gym o Mercado Pago, borrar o cancelar algo, o subir archivos; o cuando pregunte qué podés hacer. Devuelve lo permitido, lo prohibido y el motivo: decile que es por seguridad y pasale el link de la pantalla.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () =>
      jsonResult({
        canPropose: ASSISTANT_CAN_WRITE,
        cannotDo: ASSISTANT_CANNOT_WRITE.map((item) => item.action),
        reason: SECURITY_REASON,
        howItWorks:
          'Todo cambio se propone en una tarjeta y recién se hace cuando el usuario toca Confirmar (vence en 2 minutos). Los permisos son los mismos que en el panel.',
        links: ASSISTANT_CANNOT_WRITE.filter((item) => item.href !== '/').map(({ href, label }) => ({
          href,
          label,
        })),
      }),
  );
}
