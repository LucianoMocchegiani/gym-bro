import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { baYmd } from '../dates.js';
import type { ProposalLine } from '../proposals.js';
import { asRecord, pickNumber, pickString } from '../slim.js';
import { METHODS, NATURES, resolveLabelId } from './expenses.js';
import {
  changeLine,
  clearable,
  definedOnly,
  getRecord,
  money,
  ProposalError,
  proposeWrite,
  requireSomeChange,
  ymdHuman,
} from './write-support.js';

const NATURE_LABEL: Record<string, string> = { FIXED: 'Fijo', VARIABLE: 'Variable' };
const METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  MP: 'Mercado Pago',
  CARD: 'Tarjeta',
};
const LINKS = [{ href: '/gastos', label: 'Gastos' }];
const YMD = /^\d{4}-\d{2}-\d{2}$/;

const amountSchema = z.number().int().min(1).max(2_000_000_000).describe('Monto en pesos, entero.');
const dateSchema = z.string().regex(YMD).describe('Fecha del gasto YYYY-MM-DD (BA).');

async function labelOrError(name: string): Promise<{ id: string; name: string }> {
  const resolved = await resolveLabelId(name);
  if (!resolved.id) {
    throw new ProposalError(
      `No existe la etiqueta "${name.trim()}". Elegí una de la lista o creala en Gastos.`,
      { labels: resolved.known, links: LINKS },
    );
  }
  const exact = resolved.known.find((item) => item.toLowerCase() === name.trim().toLowerCase());
  return { id: resolved.id, name: exact ?? name.trim() };
}

/**
 * Propuestas de gastos (RN-GAS). Nest: `expenses.write`. Sin adjuntos.
 */
export function registerExpenseWriteTools(server: McpServer): void {
  server.registerTool(
    'propose_create_expense',
    {
      title: 'Proponer gasto',
      description:
        'Arma la carga de un gasto para que el usuario la confirme con el botón (no lo carga). label = nombre de una etiqueta existente; si no existe, devuelve la lista. Sin businessDate = hoy. El comprobante se sube después en Gastos.',
      inputSchema: {
        amount: amountSchema,
        nature: z.enum(NATURES).describe('FIXED fijo (alquiler, sueldos) o VARIABLE.'),
        method: z.enum(METHODS).describe('CASH efectivo, TRANSFER, MP, CARD.'),
        label: z.string().min(1).describe('Nombre de la etiqueta (p. ej. "Alquiler").'),
        businessDate: dateSchema.optional(),
        note: z.string().max(500).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ amount, nature, method, label, businessDate, note }) =>
      proposeWrite('expenses.write', async () => {
        const resolved = await labelOrError(label);
        const date = businessDate ?? baYmd();
        const lines: ProposalLine[] = [
          { label: 'Etiqueta', value: resolved.name },
          { label: 'Monto', value: money(amount) },
          { label: 'Tipo', value: NATURE_LABEL[nature] },
          { label: 'Medio', value: METHOD_LABEL[method] },
          { label: 'Fecha', value: ymdHuman(date) },
        ];
        if (note?.trim()) {
          lines.push({ label: 'Nota', value: note.trim() });
        }
        return {
          title: 'Cargar gasto',
          lines,
          request: {
            method: 'POST',
            path: '/api/expenses',
            body: definedOnly({
              amount,
              nature,
              method,
              labelId: resolved.id,
              businessDate: date,
              note: note?.trim() || undefined,
            }),
          },
          doneText: `Gasto cargado: ${resolved.name} ${money(amount)}. El comprobante lo podés subir en Gastos.`,
          links: LINKS,
        };
      }),
  );

  server.registerTool(
    'propose_update_expense',
    {
      title: 'Proponer edición de gasto',
      description:
        'Arma la edición de un gasto (id de list_expenses) para que el usuario la confirme. Solo mandá los campos a cambiar. note "" la borra. No edita gastos en efectivo de un día ya cerrado.',
      inputSchema: {
        expenseId: z.string().uuid(),
        amount: amountSchema.optional(),
        nature: z.enum(NATURES).optional(),
        method: z.enum(METHODS).optional(),
        label: z.string().min(1).optional(),
        businessDate: dateSchema.optional(),
        note: z.string().max(500).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ expenseId, amount, nature, method, label, businessDate, note }) =>
      proposeWrite('expenses.write', async () => {
        const before = await getRecord(`/api/expenses/${expenseId}`);
        if (before.locked === true) {
          throw new ProposalError(
            'Ese gasto en efectivo es de un día ya cerrado: no se edita.',
            { links: LINKS },
          );
        }
        const beforeLabel = asRecord(before.label);
        const resolved = label ? await labelOrError(label) : null;
        const body = {
          amount,
          nature,
          method,
          labelId: resolved?.id,
          businessDate,
          note: note === undefined ? undefined : (clearable(note) ?? ''),
        };
        requireSomeChange(body);
        const beforeAmount = pickNumber(before, 'amount');
        const labelName = beforeLabel ? pickString(beforeLabel, 'name') : null;
        const lines: ProposalLine[] = [
          {
            label: 'Gasto',
            value: `${labelName ?? 'Sin etiqueta'} ${beforeAmount !== null ? money(beforeAmount) : ''} del ${ymdHuman(pickString(before, 'businessDate') ?? '')}`.trim(),
          },
        ];
        if (amount !== undefined) {
          lines.push(changeLine('Monto', beforeAmount !== null ? money(beforeAmount) : null, money(amount)));
        }
        if (nature) {
          lines.push(changeLine('Tipo', NATURE_LABEL[pickString(before, 'nature') ?? ''] ?? null, NATURE_LABEL[nature]));
        }
        if (method) {
          lines.push(changeLine('Medio', METHOD_LABEL[pickString(before, 'method') ?? ''] ?? null, METHOD_LABEL[method]));
        }
        if (resolved) {
          lines.push(changeLine('Etiqueta', labelName, resolved.name));
        }
        if (businessDate) {
          const prev = pickString(before, 'businessDate');
          lines.push(changeLine('Fecha', prev ? ymdHuman(prev) : null, ymdHuman(businessDate)));
        }
        if (note !== undefined) {
          lines.push(changeLine('Nota', pickString(before, 'note'), clearable(note) ?? '(sin nota)'));
        }
        return {
          title: 'Editar gasto',
          lines,
          request: { method: 'PATCH', path: `/api/expenses/${expenseId}`, body: definedOnly(body) },
          doneText: 'Gasto actualizado.',
          links: LINKS,
        };
      }),
  );
}
