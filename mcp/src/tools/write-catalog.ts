import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProposalLine } from '../proposals.js';
import { asArray, asRecord, pickBool, pickNumber, pickString } from '../slim.js';
import {
  changeLine,
  clearable,
  definedOnly,
  getRecord,
  money,
  nameOf,
  ProposalError,
  proposeWrite,
  requireSomeChange,
  yesNo,
} from './write-support.js';

const TYPE_LABEL: Record<string, string> = {
  ACCESO_LIBRE: 'Acceso libre',
  POR_SESIONES: 'Por sesiones (clases con cupo)',
};
const PERIOD_LABEL: Record<string, string> = { MONTHLY: 'Mensual', ONE_TIME: 'Pago único' };
const SERVICE_LINKS = [{ href: '/dashboard/servicios', label: 'Servicios' }];
const PACK_LINKS = [{ href: '/dashboard/packs', label: 'Packs' }];

const componentSchema = z.object({
  serviceId: z.string().uuid().describe('id de list_services'),
  creditAmount: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Créditos (clases) para servicios por sesiones. Sin créditos en acceso libre.'),
});

type ComponentInput = z.infer<typeof componentSchema>;

async function componentLines(components: ComponentInput[]): Promise<string> {
  const parts: string[] = [];
  for (const component of components) {
    const service = await getRecord(`/api/services/${component.serviceId}`);
    parts.push(
      component.creditAmount
        ? `${nameOf(service)} (${component.creditAmount} créditos)`
        : nameOf(service),
    );
  }
  return parts.join(', ');
}

function beforeComponents(pack: Record<string, unknown>): string {
  return asArray(pack.components)
    .map((value) => {
      const row = asRecord(value);
      if (!row) {
        return null;
      }
      const credits = pickNumber(row, 'creditAmount');
      const name = pickString(row, 'serviceName') ?? 'Servicio';
      return credits ? `${name} (${credits} créditos)` : name;
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * Propuestas de catálogo (CU-SER-001/002). Nest: `catalog.write`.
 */
export function registerCatalogWriteTools(server: McpServer): void {
  server.registerTool(
    'propose_create_service',
    {
      title: 'Proponer servicio',
      description:
        'Arma el alta de un servicio para que el usuario la confirme. type: ACCESO_LIBRE (entra cuando quiere) o POR_SESIONES (clases con cupo). dropInPrice = precio de clase suelta, solo POR_SESIONES. El tipo no se cambia después.',
      inputSchema: {
        name: z.string().min(2).max(120),
        type: z.enum(['ACCESO_LIBRE', 'POR_SESIONES']),
        description: z.string().max(2000).optional(),
        dropInPrice: z.number().int().min(1).optional(),
        active: z.boolean().optional().describe('Default true.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ name, type, description, dropInPrice, active }) =>
      proposeWrite('catalog.write', async () => {
        if (dropInPrice !== undefined && type !== 'POR_SESIONES') {
          throw new ProposalError('La clase suelta (drop-in) solo aplica a servicios por sesiones.');
        }
        const lines: ProposalLine[] = [
          { label: 'Nombre', value: name.trim() },
          { label: 'Tipo', value: TYPE_LABEL[type] },
        ];
        if (description?.trim()) {
          lines.push({ label: 'Descripción', value: description.trim() });
        }
        if (dropInPrice !== undefined) {
          lines.push({ label: 'Clase suelta', value: money(dropInPrice) });
        }
        lines.push({ label: 'Activo', value: yesNo(active ?? true) });
        return {
          title: 'Crear servicio',
          lines,
          request: {
            method: 'POST',
            path: '/api/services',
            body: definedOnly({
              name: name.trim(),
              type,
              description: description?.trim() || undefined,
              dropInPrice,
              active,
            }),
          },
          doneText: `Servicio creado: ${name.trim()}.`,
          links: SERVICE_LINKS,
        };
      }),
  );

  server.registerTool(
    'propose_update_service',
    {
      title: 'Proponer edición de servicio',
      description:
        'Arma la edición de un servicio (id de list_services) para que el usuario la confirme. Solo los campos a cambiar. dropInPrice null = sin clase suelta. active false lo oculta (no lo borra).',
      inputSchema: {
        serviceId: z.string().uuid(),
        name: z.string().min(2).max(120).optional(),
        description: z.string().max(2000).optional(),
        dropInPrice: z.number().int().min(1).nullable().optional(),
        active: z.boolean().optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ serviceId, name, description, dropInPrice, active }) =>
      proposeWrite('catalog.write', async () => {
        const before = await getRecord(`/api/services/${serviceId}`);
        const body = {
          name: name?.trim(),
          description: clearable(description),
          dropInPrice,
          active,
        };
        requireSomeChange(body);
        const lines: ProposalLine[] = [{ label: 'Servicio', value: nameOf(before) }];
        if (body.name) {
          lines.push(changeLine('Nombre', pickString(before, 'name'), body.name));
        }
        if (body.description !== undefined) {
          lines.push(changeLine('Descripción', pickString(before, 'description'), body.description ?? '(sin descripción)'));
        }
        if (dropInPrice !== undefined) {
          const prev = pickNumber(before, 'dropInPrice');
          lines.push(
            changeLine(
              'Clase suelta',
              prev !== null ? money(prev) : 'sin clase suelta',
              dropInPrice === null ? 'sin clase suelta' : money(dropInPrice),
            ),
          );
        }
        if (active !== undefined) {
          const prev = pickBool(before, 'active');
          lines.push(changeLine('Activo', prev === null ? null : yesNo(prev), yesNo(active)));
        }
        return {
          title: 'Editar servicio',
          lines,
          request: { method: 'PATCH', path: `/api/services/${serviceId}`, body: definedOnly(body) },
          doneText: `Servicio ${nameOf(before)} actualizado.`,
          links: SERVICE_LINKS,
        };
      }),
  );

  server.registerTool(
    'propose_create_pack',
    {
      title: 'Proponer pack',
      description:
        'Arma el alta de un pack para que el usuario la confirme. components = servicios incluidos (ids de list_services) con creditAmount para los de sesiones. billingPeriod MONTHLY (mensual) o ONE_TIME (pago único). price en pesos.',
      inputSchema: {
        name: z.string().min(2).max(120),
        price: z.number().int().min(0),
        billingPeriod: z.enum(['MONTHLY', 'ONE_TIME']),
        components: z.array(componentSchema).min(1),
        description: z.string().max(2000).optional(),
        active: z.boolean().optional().describe('Default true.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ name, price, billingPeriod, components, description, active }) =>
      proposeWrite('catalog.write', async () => {
        const lines: ProposalLine[] = [
          { label: 'Nombre', value: name.trim() },
          { label: 'Precio', value: money(price) },
          { label: 'Cobro', value: PERIOD_LABEL[billingPeriod] },
          { label: 'Incluye', value: await componentLines(components) },
        ];
        if (description?.trim()) {
          lines.push({ label: 'Descripción', value: description.trim() });
        }
        lines.push({ label: 'Activo', value: yesNo(active ?? true) });
        return {
          title: 'Crear pack',
          lines,
          request: {
            method: 'POST',
            path: '/api/packs',
            body: definedOnly({
              name: name.trim(),
              price,
              billingPeriod,
              components,
              description: description?.trim() || undefined,
              active,
            }),
          },
          doneText: `Pack creado: ${name.trim()} ${money(price)}.`,
          links: PACK_LINKS,
        };
      }),
  );

  server.registerTool(
    'propose_update_pack',
    {
      title: 'Proponer edición de pack',
      description:
        'Arma la edición de un pack (id de list_packs) para que el usuario la confirme. Solo los campos a cambiar. components reemplaza la lista completa. active false lo oculta (no lo borra).',
      inputSchema: {
        packId: z.string().uuid(),
        name: z.string().min(2).max(120).optional(),
        price: z.number().int().min(0).optional(),
        billingPeriod: z.enum(['MONTHLY', 'ONE_TIME']).optional(),
        components: z.array(componentSchema).min(1).optional(),
        description: z.string().max(2000).optional(),
        active: z.boolean().optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ packId, name, price, billingPeriod, components, description, active }) =>
      proposeWrite('catalog.write', async () => {
        const before = await getRecord(`/api/packs/${packId}`);
        const body = {
          name: name?.trim(),
          price,
          billingPeriod,
          components,
          description: clearable(description),
          active,
        };
        requireSomeChange(body);
        const lines: ProposalLine[] = [{ label: 'Pack', value: nameOf(before) }];
        if (body.name) {
          lines.push(changeLine('Nombre', pickString(before, 'name'), body.name));
        }
        if (price !== undefined) {
          const prev = pickNumber(before, 'price');
          lines.push(changeLine('Precio', prev !== null ? money(prev) : null, money(price)));
        }
        if (billingPeriod) {
          lines.push(
            changeLine('Cobro', PERIOD_LABEL[pickString(before, 'billingPeriod') ?? ''] ?? null, PERIOD_LABEL[billingPeriod]),
          );
        }
        if (components) {
          lines.push(changeLine('Incluye', beforeComponents(before) || null, await componentLines(components)));
        }
        if (body.description !== undefined) {
          lines.push(changeLine('Descripción', pickString(before, 'description'), body.description ?? '(sin descripción)'));
        }
        if (active !== undefined) {
          const prev = pickBool(before, 'active');
          lines.push(changeLine('Activo', prev === null ? null : yesNo(prev), yesNo(active)));
        }
        return {
          title: 'Editar pack',
          lines,
          request: { method: 'PATCH', path: `/api/packs/${packId}`, body: definedOnly(body) },
          doneText: `Pack ${nameOf(before)} actualizado.`,
          links: PACK_LINKS,
        };
      }),
  );
}
