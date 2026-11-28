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
    billedTenantName: pickString(row, 'billedTenantName'),
    createdAt: row.createdAt ?? null,
  };
}

export function reportSummaryQuery(
  range: { from: string; to: string },
  memberId?: string,
): Record<string, string> {
  return {
    from: range.from,
    to: range.to,
    ...(memberId === undefined ? {} : { memberId }),
  };
}

async function getReportSummary(
  period?: (typeof REPORT_PERIODS)[number],
  from?: string,
  to?: string,
  memberId?: string,
) {
  return toolFromGymbro(async () => {
    const range = resolveReportYmd({ period, from, to });
    const raw = await gymbroGet(
      '/api/reports/summary',
      reportSummaryQuery(range, memberId),
    );
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
            totalDiscounts: income.totalDiscounts ?? null,
            transactionCount: income.transactionCount ?? null,
            byMethod: byMethod
              ? {
                  CASH: byMethod.CASH ?? null,
                  TRANSFER: byMethod.TRANSFER ?? null,
                  MP: byMethod.MP ?? null,
                }
              : null,
          }
        : null,
      movements: take(
        compact(asArray(income?.transactions).map(slimReportMove)),
        15,
      ),
      links: [{ href: '/dashboard/reportes', label: 'Reportes' }],
    };
  });
}

/**
 * Resumen de reportes (lectura). Nest: `reports.read`.
 */
export function registerReportsTools(server: McpServer): void {
  server.registerTool(
    'get_reports_summary',
    {
      title: 'Resumen general de reportes',
      description:
        'Consulta los ingresos, devoluciones, descuentos y movimientos de todo el tenant, sin filtrar por afiliado. Usá esta herramienta para reportes generales. Si el usuario pide el reporte de un afiliado específico, usá get_member_reports_summary. Si no precisó período, omití period y from/to: se usa el mes calendario actual en horario de Buenos Aires. Si precisa un período, pasá period (today, yesterday, this_week, last_week, this_month, last_month, this_year) o from/to YYYY-MM-DD; from/to prevalecen sobre period. Para comparar meses, llamá dos veces. No cobra.',
      inputSchema: {
        period: z
          .enum(REPORT_PERIODS)
          .optional()
          .describe(
            'Atajo BA. last_month = mes calendario anterior completo. Se ignora si mandás from/to.',
          ),
        from: z.string().optional().describe('Inicio YYYY-MM-DD (BA).'),
        to: z.string().optional().describe('Fin YYYY-MM-DD (BA).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ period, from, to }) => getReportSummary(period, from, to),
  );

  server.registerTool(
    'get_member_reports_summary',
    {
      title: 'Resumen de reportes de un afiliado',
      description:
        'Consulta los ingresos, devoluciones, descuentos y movimientos de un afiliado específico. memberId es obligatorio: si el usuario menciona al afiliado por nombre, primero buscálo con search_members y usá el id de una coincidencia clara. Si hay varios posibles, preguntá cuál; nunca inventes un id. Si no precisó período, omití period y from/to: se usa el mes calendario actual en horario de Buenos Aires. Si precisa un período, pasá period (today, yesterday, this_week, last_week, this_month, last_month, this_year) o from/to YYYY-MM-DD; from/to prevalecen sobre period. Para comparar meses, llamá dos veces. No cobra.',
      inputSchema: {
        period: z
          .enum(REPORT_PERIODS)
          .optional()
          .describe(
            'Atajo BA. last_month = mes calendario anterior completo. Se ignora si mandás from/to.',
          ),
        from: z.string().optional().describe('Inicio YYYY-MM-DD (BA).'),
        to: z.string().optional().describe('Fin YYYY-MM-DD (BA).'),
        memberId: z.string().uuid().describe('UUID real obtenido de search_members.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ period, from, to, memberId }) =>
      getReportSummary(period, from, to, memberId),
  );
}
