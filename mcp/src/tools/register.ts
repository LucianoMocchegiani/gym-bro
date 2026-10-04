import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { baYmd, isYmd } from '../dates.js';
import { gymbroGet } from '../gymbro-client.js';
import {
  asArray,
  asRecord,
  compact,
  pickNumber,
  pickString,
  take,
  toolFromGymbro,
} from '../slim.js';

function slimMovement(value: unknown): Record<string, unknown> | null {
  const row = asRecord(value);
  if (!row) {
    return null;
  }
  return {
    amount: pickNumber(row, 'amount'),
    method: pickString(row, 'method'),
    kind: pickString(row, 'kind'),
    category: pickString(row, 'category'),
    memberName: pickString(row, 'memberName'),
    billedTenantName: pickString(row, 'billedTenantName'),
    createdAt: row.createdAt ?? null,
  };
}

/**
 * Caja del día (lectura). Nest exige `cashier.operate`.
 */
export function registerRegisterTools(server: McpServer): void {
  server.registerTool(
    'get_cash_day',
    {
      title: 'Caja del día',
      description:
        'Totales y pocos movimientos de caja de un día (timezone Buenos Aires). `cash.expected` es el efectivo esperado del cierre: cobros en efectivo − devoluciones en efectivo − gastos en efectivo. `digital.expected` es el digital esperado (lo mismo con MP, transferencia y tarjeta): informativo, no entra al cierre. Neto del día = cash.expected + digital.expected. Sin date usa hoy. No arquea ni cobra. Requiere permiso de caja.',
      inputSchema: {
        date: z
          .string()
          .optional()
          .describe('Día YYYY-MM-DD en zona BA. Default: hoy.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ date }) =>
      toolFromGymbro(async () => {
        const ymd = date?.trim();
        const businessDate = ymd && isYmd(ymd) ? ymd : baYmd();
        const raw = await gymbroGet('/api/payment-register/day', {
          date: businessDate,
        });
        const body = asRecord(raw) ?? {};
        const totals = asRecord(body.totals);
        const cash = asRecord(body.cash);
        const digital = asRecord(body.digital);
        const recon = asRecord(body.reconciliation);
        return {
          businessDate: pickString(body, 'businessDate') ?? businessDate,
          timezone: 'America/Argentina/Buenos_Aires',
          totals: totals
            ? {
                income: totals.income ?? null,
                outcome: totals.outcome ?? null,
                net: totals.net ?? null,
                movementCount: totals.movementCount ?? null,
              }
            : null,
          cash: cash
            ? {
                income: cash.income ?? null,
                outcome: cash.outcome ?? null,
                expenses: cash.expenses ?? null,
                expected: cash.expected ?? null,
              }
            : null,
          digital: digital
            ? {
                income: digital.income ?? null,
                outcome: digital.outcome ?? null,
                expenses: digital.expenses ?? null,
                expected: digital.expected ?? null,
              }
            : null,
          movements: take(compact(asArray(body.movements).map(slimMovement)), 8),
          reconciliation: recon
            ? {
                difference: recon.difference ?? null,
                declaredAmount: recon.declaredAmount ?? null,
                expectedAmount: recon.expectedAmount ?? null,
              }
            : null,
          links: [
            { href: '/dashboard/caja', label: 'Caja' },
            { href: '/dashboard/arqueo', label: 'Arqueo' },
          ],
        };
      }),
  );
}
