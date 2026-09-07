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
        'Totales y pocos movimientos de caja de un día (timezone Buenos Aires). Sin date usa hoy. No arquea ni cobra. Requiere permiso de caja.',
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
          movements: take(compact(asArray(body.movements).map(slimMovement)), 8),
          reconciliation: recon
            ? {
                difference: recon.difference ?? null,
                declaredAmount: recon.declaredAmount ?? null,
                expectedAmount: recon.expectedAmount ?? null,
              }
            : null,
          links: [
            { href: '/caja', label: 'Caja' },
            { href: '/arqueo', label: 'Arqueo' },
          ],
        };
      }),
  );
}
