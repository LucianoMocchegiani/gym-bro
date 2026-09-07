import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { REPORT_PERIODS, resolveReportYmd } from '../dates.js';
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

function slimReportMove(value: unknown): Record<string, unknown> | null {
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
 * Resumen de reportes (lectura). Nest: `reports.read`.
 */
export function registerReportsTools(server: McpServer): void {
  server.registerTool(
    'get_reports_summary',
    {
      title: 'Resumen de reportes',
      description:
        'Ingresos, devoluciones y snapshot de socios/contratos (timezone Buenos Aires). Si el usuario dice un período, PASÁ period: this_week (esta semana), last_week (semana pasada), this_month (este mes), last_month (mes anterior / el mes pasado), this_year (este año). Solo omití period y from/to cuando no precisó rango: ahí el MCP usa el mes calendario actual. from/to YYYY-MM-DD ganan sobre period. Para comparar dos meses, llamá dos veces. No cobra.',
      inputSchema: {
        period: z
          .enum(REPORT_PERIODS)
          .optional()
          .describe(
            'Atajo BA. last_month = mes calendario anterior completo. Se ignora si mandás from/to.',
          ),
        from: z.string().optional().describe('Inicio YYYY-MM-DD (BA).'),
        to: z.string().optional().describe('Fin YYYY-MM-DD (BA).'),
        memberId: z.string().uuid().optional().describe('Filtrar por afiliado.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ period, from, to, memberId }) =>
      toolFromGymbro(async () => {
        const range = resolveReportYmd({ period, from, to });
        const raw = await gymbroGet('/api/reports/summary', {
          from: range.from,
          to: range.to,
          memberId,
        });
        const body = asRecord(raw) ?? {};
        const members = asRecord(body.members);
        const contracts = asRecord(body.contracts);
        const income = asRecord(body.income);
        const byMethod = income ? asRecord(income.byMethod) : null;
        return {
          period: range.period,
          from: range.from,
          to: range.to,
          timezone: 'America/Argentina/Buenos_Aires',
          members: members
            ? {
                active: members.active ?? null,
                suspended: members.suspended ?? null,
                inactive: members.inactive ?? null,
              }
            : null,
          contracts: contracts
            ? {
                active: contracts.active ?? null,
                expired: contracts.expired ?? null,
                cancelled: contracts.cancelled ?? null,
              }
            : null,
          income: income
            ? {
                totalApproved: income.totalApproved ?? null,
                totalRefunded: income.totalRefunded ?? null,
                transactionCount: income.transactionCount ?? null,
                byMethod: byMethod
                  ? { CASH: byMethod.CASH ?? null, MP: byMethod.MP ?? null }
                  : null,
              }
            : null,
          movements: take(
            compact(asArray(income?.transactions).map(slimReportMove)),
            15,
          ),
          links: [{ href: '/reportes', label: 'Reportes' }],
        };
      }),
  );
}
