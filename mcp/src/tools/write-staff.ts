import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gymbroGet } from '../gymbro-client.js';
import { GYM_PERMISSION_CODES, GYM_PERMISSIONS } from '../permission-codes.js';
import type { ProposalLine } from '../proposals.js';
import {
  asArray,
  asRecord,
  compact,
  pickBool,
  pickString,
  take,
  toolFromGymbro,
} from '../slim.js';
import {
  changeLine,
  definedOnly,
  getRecord,
  nameOf,
  ProposalError,
  proposeWrite,
  requireSomeChange,
} from './write-support.js';

const STAFF_LINKS = [{ href: '/staff', label: 'Staff' }];
const ROLE_LINKS = [{ href: '/roles', label: 'Roles y permisos' }];
const SEARCH_SIZE = 10;

function roleNames(staff: Record<string, unknown>): string[] {
  return compact(
    asArray(staff.roles).map((value) => {
      const row = asRecord(value);
      return row ? pickString(row, 'name') : null;
    }),
  );
}

function slimStaff(value: unknown): Record<string, unknown> | null {
  const row = asRecord(value);
  const id = row ? pickString(row, 'id') : null;
  if (!row || !id) {
    return null;
  }
  return {
    id,
    name: pickString(row, 'name'),
    email: pickString(row, 'email'),
    active: pickBool(row, 'active'),
    roles: roleNames(row),
  };
}

async function roleLabels(roleIds: string[]): Promise<string> {
  if (roleIds.length === 0) {
    return '(sin roles)';
  }
  const names: string[] = [];
  for (const roleId of roleIds) {
    names.push(nameOf(await getRecord(`/api/roles/${roleId}`)));
  }
  return names.join(', ');
}

function permissionsText(codes: string[]): string {
  return codes.map((code) => GYM_PERMISSIONS[code] ?? code).join(', ');
}

function assertKnownCodes(codes: string[]): void {
  const unknown = codes.filter((code) => !GYM_PERMISSION_CODES.includes(code));
  if (unknown.length > 0) {
    throw new ProposalError(`Permisos desconocidos: ${unknown.join(', ')}.`, {
      permissions: GYM_PERMISSIONS,
    });
  }
}

/**
 * Staff y roles: búsqueda (lectura) y propuestas. Asignar roles y tocar permisos = peligroso.
 */
export function registerStaffWriteTools(server: McpServer): void {
  server.registerTool(
    'search_staff',
    {
      title: 'Buscar staff',
      description:
        'Staff del gym (id, nombre, mail, activo, roles) por nombre o mail. Sirve para elegir instructor o editar staff. Requiere permiso de ver staff.',
      inputSchema: { q: z.string().optional() },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ q }) =>
      toolFromGymbro(async () => {
        const raw = await gymbroGet('/api/staff', {
          q: q?.trim() || undefined,
          page: 1,
          pageSize: SEARCH_SIZE,
        });
        const body = asRecord(raw) ?? {};
        const items = take(compact(asArray(body.items).map(slimStaff)), SEARCH_SIZE);
        return {
          items,
          total: typeof body.total === 'number' ? body.total : items.length,
          links: STAFF_LINKS,
        };
      }),
  );

  server.registerTool(
    'propose_create_staff',
    {
      title: 'Proponer alta de staff',
      description:
        'Arma el alta de un usuario staff para que el usuario la confirme. No pidas contraseña: queda ChangeMe123! temporal. roleIds opcional (ids de list_roles); si va con roles, la tarjeta pide escribir CONFIRMAR.',
      inputSchema: {
        email: z.string().email(),
        name: z.string().min(2).max(120).optional(),
        roleIds: z.array(z.string().uuid()).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ email, name, roleIds }) =>
      proposeWrite('staff.write', async () => {
        const ids = [...new Set(roleIds ?? [])];
        const lines: ProposalLine[] = [{ label: 'Mail', value: email.trim().toLowerCase() }];
        if (name?.trim()) {
          lines.push({ label: 'Nombre', value: name.trim() });
        }
        lines.push({ label: 'Roles', value: await roleLabels(ids) });
        lines.push({
          label: 'Contraseña',
          value: 'ChangeMe123! temporal (si ya tenía cuenta Faciliter, conserva la suya)',
        });
        return {
          title: 'Alta de staff',
          lines,
          request: {
            method: 'POST',
            path: '/api/staff',
            body: definedOnly({
              email: email.trim().toLowerCase(),
              name: name?.trim() || undefined,
              roleIds: ids.length > 0 ? ids : undefined,
            }),
          },
          doneText: `Staff creado: ${name?.trim() || email.trim().toLowerCase()}.`,
          links: STAFF_LINKS,
          dangerous: ids.length > 0,
        };
      }),
  );

  server.registerTool(
    'propose_update_staff',
    {
      title: 'Proponer edición de staff',
      description:
        'Arma la edición de nombre o mail de un staff (id de search_staff) para que el usuario la confirme. Para roles usá propose_set_staff_roles.',
      inputSchema: {
        staffId: z.string().uuid(),
        name: z.string().min(2).max(120).optional(),
        email: z.string().email().optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ staffId, name, email }) =>
      proposeWrite('staff.write', async () => {
        const before = await getRecord(`/api/staff/${staffId}`);
        const body = { name: name?.trim(), email: email?.trim().toLowerCase() };
        requireSomeChange(body);
        const lines: ProposalLine[] = [{ label: 'Staff', value: nameOf(before) }];
        if (body.name) {
          lines.push(changeLine('Nombre', pickString(before, 'name'), body.name));
        }
        if (body.email) {
          lines.push(changeLine('Mail', pickString(before, 'email'), body.email));
        }
        return {
          title: 'Editar staff',
          lines,
          request: { method: 'PATCH', path: `/api/staff/${staffId}`, body: definedOnly(body) },
          doneText: `Staff ${nameOf(before)} actualizado.`,
          links: STAFF_LINKS,
        };
      }),
  );

  server.registerTool(
    'propose_set_staff_roles',
    {
      title: 'Proponer roles de staff',
      description:
        'Arma el reemplazo completo de los roles de un staff (ids de list_roles; lista vacía = sin roles) para que el usuario lo confirme. Peligroso: la tarjeta pide escribir CONFIRMAR.',
      inputSchema: {
        staffId: z.string().uuid(),
        roleIds: z.array(z.string().uuid()),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ staffId, roleIds }) =>
      proposeWrite('staff.write', async () => {
        const before = await getRecord(`/api/staff/${staffId}`);
        const ids = [...new Set(roleIds)];
        const prev = roleNames(before);
        return {
          title: 'Cambiar roles de staff',
          lines: [
            { label: 'Staff', value: nameOf(before) },
            changeLine('Roles', prev.length > 0 ? prev.join(', ') : '(sin roles)', await roleLabels(ids)),
          ],
          request: { method: 'PUT', path: `/api/staff/${staffId}/roles`, body: { roleIds: ids } },
          doneText: `Roles de ${nameOf(before)} actualizados.`,
          links: STAFF_LINKS,
          dangerous: true,
        };
      }),
  );

  server.registerTool(
    'propose_create_role',
    {
      title: 'Proponer rol',
      description: `Arma un rol nuevo con sus permisos para que el usuario lo confirme. Peligroso: la tarjeta pide escribir CONFIRMAR. permissionCodes válidos: ${GYM_PERMISSION_CODES.join(', ')}.`,
      inputSchema: {
        name: z.string().min(2).max(80),
        permissionCodes: z.array(z.string()).min(1),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ name, permissionCodes }) =>
      proposeWrite('roles.write', async () => {
        const codes = [...new Set(permissionCodes)];
        assertKnownCodes(codes);
        return {
          title: 'Crear rol',
          lines: [
            { label: 'Nombre', value: name.trim() },
            { label: 'Permisos', value: permissionsText(codes) },
          ],
          request: { method: 'POST', path: '/api/roles', body: { name: name.trim(), permissionCodes: codes } },
          doneText: `Rol creado: ${name.trim()}. Asignalo a un staff para que tenga efecto.`,
          links: ROLE_LINKS,
          dangerous: true,
        };
      }),
  );

  server.registerTool(
    'propose_update_role',
    {
      title: 'Proponer edición de rol',
      description: `Arma la edición de un rol (id de list_roles): nombre y/o permisos (permissionCodes reemplaza la lista completa). El rol Admin no se edita. Peligroso: la tarjeta pide escribir CONFIRMAR. Códigos válidos: ${GYM_PERMISSION_CODES.join(', ')}.`,
      inputSchema: {
        roleId: z.string().uuid(),
        name: z.string().min(2).max(80).optional(),
        permissionCodes: z.array(z.string()).min(1).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ roleId, name, permissionCodes }) =>
      proposeWrite('roles.write', async () => {
        const before = await getRecord(`/api/roles/${roleId}`);
        if (pickString(before, 'slug') === 'admin') {
          throw new ProposalError('El rol Admin no se edita.');
        }
        const codes = permissionCodes ? [...new Set(permissionCodes)] : undefined;
        if (codes) {
          assertKnownCodes(codes);
        }
        const body = { name: name?.trim(), permissionCodes: codes };
        requireSomeChange(body);
        const lines: ProposalLine[] = [{ label: 'Rol', value: nameOf(before) }];
        if (body.name) {
          lines.push(changeLine('Nombre', pickString(before, 'name'), body.name));
        }
        if (codes) {
          const prev = asArray(before.permissionCodes).filter(
            (item): item is string => typeof item === 'string',
          );
          const added = codes.filter((code) => !prev.includes(code));
          const removed = prev.filter((code) => !codes.includes(code));
          lines.push({ label: 'Suma', value: added.length > 0 ? permissionsText(added) : '(nada)' });
          lines.push({ label: 'Quita', value: removed.length > 0 ? permissionsText(removed) : '(nada)' });
        }
        return {
          title: 'Editar rol',
          lines,
          request: { method: 'PATCH', path: `/api/roles/${roleId}`, body: definedOnly(body) },
          doneText: `Rol ${nameOf(before)} actualizado.`,
          links: ROLE_LINKS,
          dangerous: true,
        };
      }),
  );
}
