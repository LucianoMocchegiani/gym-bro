import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProposalLine } from '../proposals.js';
import { pickString } from '../slim.js';
import {
  changeLine,
  clearable,
  definedOnly,
  getRecord,
  nameOf,
  proposeWrite,
  requireSomeChange,
} from './write-support.js';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activo',
  SUSPENDED: 'Suspendido',
  INACTIVE: 'Baja',
};
const LINKS = [{ href: '/dashboard/afiliados', label: 'Afiliados' }];
const TEMP_PASSWORD_LINE = {
  label: 'Contraseña',
  value: 'ChangeMe123! temporal (se le pide cambiarla al entrar; si ya tenía cuenta Faciliter, conserva la suya)',
};

/**
 * Propuestas de afiliados (CU-AFI-001..003). Alta sin password → temporal (RN-ASI-003).
 */
export function registerMemberWriteTools(server: McpServer): void {
  server.registerTool(
    'propose_create_member',
    {
      title: 'Proponer alta de afiliado',
      description:
        'Arma el alta de un afiliado para que el usuario la confirme (no lo crea). Mail y nombre obligatorios. No pidas contraseña: queda ChangeMe123! temporal. Antes buscá con search_members que no exista.',
      inputSchema: {
        name: z.string().min(2).max(120),
        email: z.string().email(),
        document: z.string().max(40).optional().describe('DNI.'),
        phone: z.string().max(40).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ name, email, document, phone }) =>
      proposeWrite('members.write', async () => {
        const lines: ProposalLine[] = [
          { label: 'Nombre', value: name.trim() },
          { label: 'Mail', value: email.trim().toLowerCase() },
        ];
        if (document?.trim()) {
          lines.push({ label: 'DNI', value: document.trim() });
        }
        if (phone?.trim()) {
          lines.push({ label: 'Teléfono', value: phone.trim() });
        }
        lines.push(TEMP_PASSWORD_LINE);
        return {
          title: 'Alta de afiliado',
          lines,
          request: {
            method: 'POST',
            path: '/api/members',
            body: definedOnly({
              name: name.trim(),
              email: email.trim().toLowerCase(),
              document: document?.trim() || undefined,
              phone: phone?.trim() || undefined,
            }),
          },
          doneText: `Afiliado creado: ${name.trim()}. Para que pueda entrar, vendele un pack en Caja.`,
          links: [...LINKS, { href: '/dashboard/caja', label: 'Caja' }],
        };
      }),
  );

  server.registerTool(
    'propose_update_member',
    {
      title: 'Proponer edición de ficha',
      description:
        'Arma la edición de la ficha de un afiliado (id de search_members) para que el usuario la confirme. Solo los campos a cambiar; "" borra DNI o teléfono. Para baja/suspensión usá propose_set_member_status.',
      inputSchema: {
        memberId: z.string().uuid(),
        name: z.string().min(2).max(120).optional(),
        email: z.string().email().optional(),
        document: z.string().max(40).optional(),
        phone: z.string().max(40).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ memberId, name, email, document, phone }) =>
      proposeWrite('members.write', async () => {
        const before = await getRecord(`/api/members/${memberId}`);
        const body = {
          name: name?.trim(),
          email: email?.trim().toLowerCase(),
          document: clearable(document),
          phone: clearable(phone),
        };
        requireSomeChange(body);
        const lines: ProposalLine[] = [{ label: 'Afiliado', value: nameOf(before) }];
        if (body.name) {
          lines.push(changeLine('Nombre', pickString(before, 'name'), body.name));
        }
        if (body.email) {
          lines.push(changeLine('Mail', pickString(before, 'email'), body.email));
        }
        if (body.document !== undefined) {
          lines.push(changeLine('DNI', pickString(before, 'document'), body.document ?? '(sin DNI)'));
        }
        if (body.phone !== undefined) {
          lines.push(changeLine('Teléfono', pickString(before, 'phone'), body.phone ?? '(sin teléfono)'));
        }
        return {
          title: 'Editar ficha de afiliado',
          lines,
          request: { method: 'PATCH', path: `/api/members/${memberId}`, body: definedOnly(body) },
          doneText: `Ficha de ${nameOf(before)} actualizada.`,
          links: LINKS,
        };
      }),
  );

  server.registerTool(
    'propose_set_member_status',
    {
      title: 'Proponer cambio de estado',
      description:
        'Arma el cambio de estado de un afiliado (ACTIVE activo, SUSPENDED suspendido, INACTIVE baja) para que el usuario lo confirme. Acción peligrosa: la tarjeta pide escribir CONFIRMAR. No borra al socio.',
      inputSchema: {
        memberId: z.string().uuid(),
        status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ memberId, status }) =>
      proposeWrite('members.deactivate', async () => {
        const before = await getRecord(`/api/members/${memberId}`);
        const prev = pickString(before, 'status');
        return {
          title: 'Cambiar estado de afiliado',
          lines: [
            { label: 'Afiliado', value: nameOf(before) },
            changeLine('Estado', prev ? (STATUS_LABEL[prev] ?? prev) : null, STATUS_LABEL[status]),
          ],
          request: { method: 'PATCH', path: `/api/members/${memberId}/status`, body: { status } },
          doneText: `${nameOf(before)} quedó ${STATUS_LABEL[status].toLowerCase()}.`,
          links: LINKS,
          dangerous: true,
        };
      }),
  );
}
