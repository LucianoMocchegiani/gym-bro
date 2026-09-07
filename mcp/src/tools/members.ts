import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gymbroGet } from '../gymbro-client.js';
import {
  asArray,
  asRecord,
  compact,
  pickString,
  take,
  toolFromGymbro,
} from '../slim.js';

const SEARCH_SIZE = 8;

function slimMember(value: unknown): Record<string, unknown> | null {
  const row = asRecord(value);
  if (!row) {
    return null;
  }
  const id = pickString(row, 'id');
  if (!id) {
    return null;
  }
  return {
    id,
    name: pickString(row, 'name'),
    email: pickString(row, 'email'),
    document: pickString(row, 'document'),
    status: pickString(row, 'status'),
  };
}

function slimContract(value: unknown): Record<string, unknown> | null {
  const row = asRecord(value);
  if (!row) {
    return null;
  }
  const id = pickString(row, 'id');
  if (!id) {
    return null;
  }
  const balances = asArray(row.creditBalances);
  let remaining = 0;
  for (const balance of balances) {
    const rec = asRecord(balance);
    if (!rec) {
      continue;
    }
    const n = rec.remaining;
    if (typeof n === 'number' && Number.isFinite(n)) {
      remaining += n;
    }
  }
  return {
    id,
    packName: pickString(row, 'packName'),
    status: pickString(row, 'status'),
    startsAt: row.startsAt ?? null,
    endsAt: row.endsAt ?? null,
    hasAccessLibre: row.hasAccessLibre === true,
    creditsRemaining: remaining,
  };
}

function slimReservation(value: unknown): Record<string, unknown> | null {
  const row = asRecord(value);
  if (!row) {
    return null;
  }
  const id = pickString(row, 'id');
  if (!id) {
    return null;
  }
  return {
    id,
    sessionId: pickString(row, 'sessionId'),
    serviceName: pickString(row, 'serviceName'),
    startsAt: row.startsAt ?? null,
    status: pickString(row, 'status'),
    coverage: pickString(row, 'coverage'),
  };
}

/**
 * Tools de afiliados (lectura): búsqueda y estado de cuenta recortado.
 */
export function registerMemberTools(server: McpServer): void {
  server.registerTool(
    'search_members',
    {
      title: 'Buscar afiliados',
      description:
        'Busca afiliados del gym por nombre, email o documento. Devuelve hasta 8 filas recortadas. Usá get_member_account con el id.',
      inputSchema: {
        q: z
          .string()
          .optional()
          .describe('Texto libre (nombre, email o documento). Vacío lista los primeros.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ q }) =>
      toolFromGymbro(async () => {
        const raw = await gymbroGet('/api/members', {
          q: q?.trim() || undefined,
          pageSize: SEARCH_SIZE,
          page: 1,
        });
        const body = asRecord(raw) ?? {};
        const items = take(compact(asArray(body.items).map(slimMember)), SEARCH_SIZE);
        return {
          items,
          total: typeof body.total === 'number' ? body.total : items.length,
          links: [{ href: '/afiliados', label: 'Afiliados' }],
        };
      }),
  );

  server.registerTool(
    'get_member_account',
    {
      title: 'Estado de cuenta',
      description:
        'Deuda, packs vigentes, créditos y próximas reservas de un afiliado. Pasá el id de search_members. No cobra ni edita.',
      inputSchema: {
        memberId: z.string().uuid().describe('UUID del afiliado'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ memberId }) =>
      toolFromGymbro(async () => {
        const raw = await gymbroGet(`/api/members/${memberId}/account`, {
          coverage: 'current',
        });
        const body = asRecord(raw);
        if (!body) {
          return { error: 'respuesta vacía' };
        }
        const member = slimMember(body.member);
        const summary = asRecord(body.summary);
        const debt = asRecord(body.debt);
        const name = member && typeof member.name === 'string' ? member.name : 'Afiliado';
        return {
          member,
          summary: summary
            ? {
                activeContracts: summary.activeContracts ?? null,
                hasAccessLibre: summary.hasAccessLibre === true,
                totalCreditsRemaining: summary.totalCreditsRemaining ?? null,
              }
            : null,
          debt: debt
            ? { amount: debt.amount ?? null, status: debt.status ?? null }
            : null,
          contracts: take(compact(asArray(body.contracts).map(slimContract)), 8),
          reservations: take(
            compact(asArray(body.reservations).map(slimReservation)),
            8,
          ),
          links: [
            { href: '/afiliados', label: name },
            { href: '/caja', label: 'Caja' },
          ],
        };
      }),
  );
}
