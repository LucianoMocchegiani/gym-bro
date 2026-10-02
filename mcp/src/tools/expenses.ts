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

const NATURES = ['FIXED', 'VARIABLE'] as const;
const METHODS = ['CASH', 'TRANSFER', 'MP', 'CARD'] as const;
const LIST_MAX = 15;

const periodSchema = z
  .enum(REPORT_PERIODS)
  .optional()
  .describe(
    'Atajo BA: today (hoy), yesterday (ayer), this_week, last_week, this_month, last_month (mes pasado), this_year. Se ignora si mandás from/to.',
  );

function slimExpense(value: unknown): Record<string, unknown> | null {
  const row = asRecord(value);
  if (!row) {
    return null;
  }
  const label = asRecord(row.label);
  return {
    businessDate: pickString(row, 'businessDate'),
    amount: pickNumber(row, 'amount'),
    nature: pickString(row, 'nature'),
    method: pickString(row, 'method'),
    label: label ? pickString(label, 'name') : null,
    note: pickString(row, 'note'),
    recordedByName: pickString(row, 'recordedByName'),
    files: asArray(row.files).length,
  };
}

/** Nombre de etiqueta → id (case-insensitive, incluye archivadas). */
async function resolveLabelId(
  name: string,
): Promise<{ id: string | null; known: string[] }> {
  const raw = await gymbroGet('/api/expense-labels', { includeArchived: 'true' });
  const labels = compact(
    asArray(raw).map((value) => {
      const row = asRecord(value);
      const id = row ? pickString(row, 'id') : null;
      const labelName = row ? pickString(row, 'name') : null;
      return id && labelName ? { id, name: labelName } : null;
    }),
  );
  const wanted = name.trim().toLowerCase();
  const exact = labels.find((l) => l.name.toLowerCase() === wanted);
  const partial = labels.filter((l) => l.name.toLowerCase().includes(wanted));
  const match = exact ?? (partial.length === 1 ? partial[0] : undefined);
  return { id: match?.id ?? null, known: labels.map((l) => l.name) };
}

/**
 * Gastos del gym (lectura). Nest: `expenses.read`. No carga ni edita.
 */
export function registerExpenseTools(server: McpServer): void {
  server.registerTool(
    'get_expenses_summary',
    {
      title: 'Resumen de gastos',
      description:
        'Gastos del gym en un período (timezone Buenos Aires): total, cantidad, fijos vs variables, por medio (efectivo, transferencia, MP, tarjeta) y por etiqueta (alquiler, luz…). Si el usuario dice un período, PASÁ period; sin period ni fechas = mes calendario actual. Para el resultado (ingresos − devoluciones − gastos) combiná con get_reports_summary del mismo período. Para comparar meses, llamá dos veces. Requiere permiso de gastos. No carga gastos.',
      inputSchema: {
        period: periodSchema,
        from: z.string().optional().describe('Inicio YYYY-MM-DD (BA).'),
        to: z.string().optional().describe('Fin YYYY-MM-DD (BA).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ period, from, to }) =>
      toolFromGymbro(async () => {
        const range = resolveReportYmd({ period, from, to });
        const raw = await gymbroGet('/api/expenses/summary', {
          from: range.from,
          to: range.to,
        });
        const body = asRecord(raw) ?? {};
        return {
          period: range.period,
          from: range.from,
          to: range.to,
          timezone: 'America/Argentina/Buenos_Aires',
          total: body.total ?? null,
          count: body.count ?? null,
          byNature: body.byNature ?? null,
          byMethod: body.byMethod ?? null,
          byLabel: take(
            compact(
              asArray(body.byLabel).map((value) => {
                const row = asRecord(value);
                return row
                  ? {
                      name: pickString(row, 'name'),
                      total: pickNumber(row, 'total'),
                      count: pickNumber(row, 'count'),
                    }
                  : null;
              }),
            ),
            20,
          ),
          links: [{ href: '/gastos', label: 'Gastos' }],
        };
      }),
  );

  server.registerTool(
    'list_expenses',
    {
      title: 'Gastos',
      description:
        'Últimos gastos del gym (máx. 15, más recientes primero) con fecha, monto, fijo/variable, medio, etiqueta y nota. Filtros: period o from/to (default mes actual BA), label (nombre de la etiqueta, p. ej. "alquiler"), nature, method. Para totales usá get_expenses_summary. Requiere permiso de gastos. No carga ni edita.',
      inputSchema: {
        period: periodSchema,
        from: z.string().optional().describe('Inicio YYYY-MM-DD (BA).'),
        to: z.string().optional().describe('Fin YYYY-MM-DD (BA).'),
        label: z
          .string()
          .optional()
          .describe('Nombre de la etiqueta (no hace falta el id).'),
        nature: z.enum(NATURES).optional().describe('FIXED = fijo, VARIABLE = variable.'),
        method: z
          .enum(METHODS)
          .optional()
          .describe('CASH efectivo, TRANSFER transferencia, MP Mercado Pago, CARD tarjeta.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ period, from, to, label, nature, method }) =>
      toolFromGymbro(async () => {
        const range = resolveReportYmd({ period, from, to });
        let labelId: string | undefined;
        if (label?.trim()) {
          const resolved = await resolveLabelId(label);
          if (!resolved.id) {
            return {
              error: `No encontré la etiqueta "${label.trim()}".`,
              labels: resolved.known,
            };
          }
          labelId = resolved.id;
        }
        const raw = await gymbroGet('/api/expenses', {
          from: range.from,
          to: range.to,
          labelId,
          nature,
          method,
          page: 1,
          pageSize: LIST_MAX,
        });
        const body = asRecord(raw) ?? {};
        const items = take(compact(asArray(body.items).map(slimExpense)), LIST_MAX);
        return {
          period: range.period,
          from: range.from,
          to: range.to,
          items,
          total: typeof body.total === 'number' ? body.total : items.length,
          links: [{ href: '/gastos', label: 'Gastos' }],
        };
      }),
  );
}
