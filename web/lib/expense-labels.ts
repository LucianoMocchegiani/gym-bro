import type { ExpenseMethod, ExpenseNature } from '@/lib/api/expenses';

export const EXPENSE_NATURE_OPTIONS: ReadonlyArray<{
  value: ExpenseNature;
  label: string;
}> = [
  { value: 'FIXED', label: 'Fijo' },
  { value: 'VARIABLE', label: 'Variable' },
];

export const EXPENSE_METHOD_OPTIONS: ReadonlyArray<{
  value: ExpenseMethod;
  label: string;
}> = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'MP', label: 'Mercado Pago' },
  { value: 'CARD', label: 'Tarjeta' },
];

/** Fijo / Variable. */
export function formatExpenseNature(nature: ExpenseNature): string {
  return EXPENSE_NATURE_OPTIONS.find((o) => o.value === nature)?.label ?? nature;
}

/** Medio con el que se pagó el gasto. */
export function formatExpenseMethod(method: ExpenseMethod): string {
  return EXPENSE_METHOD_OPTIONS.find((o) => o.value === method)?.label ?? method;
}

/** `2026-10-01` → `01/10/2026`. */
export function formatYmd(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  return y && m && d ? `${d}/${m}/${y}` : ymd;
}
