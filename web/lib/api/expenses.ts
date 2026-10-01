/**
 * Gastos del local (módulo `expenses`).
 *
 * Topes alineados con `api/src/expenses/expenses.constants.ts` (RN-GAS-005).
 */

import { ApiClientError, apiMultipart, apiRequest } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';
import { readStaffSession } from '@/lib/auth/session';

export const EXPENSE_MAX_FILES = 5;
export const EXPENSE_NOTE_MAX = 500;
export const EXPENSE_LABEL_NAME_MAX = 80;

export type ExpenseNature = 'FIXED' | 'VARIABLE';
export type ExpenseMethod = 'CASH' | 'TRANSFER' | 'MP' | 'CARD';

export type ExpenseLabelDetail = {
  id: string;
  name: string;
  archived: boolean;
  expenseCount: number;
};

export type ExpenseFileDetail = {
  id: string;
  originalFilename: string;
  mime: string;
  sizeBytes: number;
  createdAt: string;
};

export type ExpenseDetail = {
  id: string;
  businessDate: string;
  amount: number;
  nature: ExpenseNature;
  method: ExpenseMethod;
  label: { id: string; name: string };
  note: string | null;
  recordedByName: string | null;
  files: ExpenseFileDetail[];
  /** Efectivo de un día con cierre hecho: no se edita ni se borra. */
  locked: boolean;
  createdAt: string;
};

export type ExpensesSummary = {
  from: string;
  to: string;
  total: number;
  count: number;
  byNature: Record<ExpenseNature, number>;
  byMethod: Record<ExpenseMethod, number>;
  byLabel: Array<{ labelId: string; name: string; total: number; count: number }>;
};

export type ExpenseInput = {
  businessDate?: string;
  amount: number;
  nature: ExpenseNature;
  method: ExpenseMethod;
  labelId: string;
  note?: string;
};

export type ListExpensesParams = ListParams & {
  from?: string;
  to?: string;
  labelId?: string;
  nature?: ExpenseNature;
  method?: ExpenseMethod;
};

/** Etiquetas del gym. `includeArchived` para administrarlas. */
export function listExpenseLabels(
  includeArchived = false,
): Promise<ExpenseLabelDetail[]> {
  const q = includeArchived ? '?includeArchived=true' : '';
  return apiRequest<ExpenseLabelDetail[]>(`/expense-labels${q}`);
}

export function createExpenseLabel(name: string): Promise<ExpenseLabelDetail> {
  return apiRequest<ExpenseLabelDetail>('/expense-labels', {
    method: 'POST',
    body: { name },
  });
}

/** Renombra o archiva/desarchiva. */
export function updateExpenseLabel(
  id: string,
  input: { name?: string; archived?: boolean },
): Promise<ExpenseLabelDetail> {
  return apiRequest<ExpenseLabelDetail>(`/expense-labels/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

/** Solo si no tiene gastos (si no, 409: hay que archivarla). */
export function deleteExpenseLabel(id: string): Promise<void> {
  return apiRequest<void>(`/expense-labels/${id}`, { method: 'DELETE' });
}

export function listExpenses(
  params: ListExpensesParams,
): Promise<ListResult<ExpenseDetail>> {
  const q = toSearchParams(params);
  return apiRequest<ListResult<ExpenseDetail>>(`/expenses${q ? `?${q}` : ''}`);
}

export function getExpense(id: string): Promise<ExpenseDetail> {
  return apiRequest<ExpenseDetail>(`/expenses/${id}`);
}

export function createExpense(input: ExpenseInput): Promise<ExpenseDetail> {
  return apiRequest<ExpenseDetail>('/expenses', {
    method: 'POST',
    body: input,
  });
}

/** `note: ''` borra la nota. */
export function updateExpense(
  id: string,
  input: Partial<ExpenseInput>,
): Promise<ExpenseDetail> {
  return apiRequest<ExpenseDetail>(`/expenses/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteExpense(id: string): Promise<void> {
  return apiRequest<void>(`/expenses/${id}`, { method: 'DELETE' });
}

export function getExpensesSummary(input: {
  from?: string;
  to?: string;
}): Promise<ExpensesSummary> {
  const q = toSearchParams(input);
  return apiRequest<ExpensesSummary>(
    `/expenses/summary${q ? `?${q}` : ''}`,
  );
}

/** Sube un comprobante (PDF o imagen, máx. 5 MB). */
export function uploadExpenseFile(
  expenseId: string,
  file: File,
): Promise<ExpenseFileDetail> {
  const formData = new FormData();
  formData.append('file', file);
  return apiMultipart<ExpenseFileDetail>(
    `/expenses/${expenseId}/files`,
    formData,
  );
}

export function deleteExpenseFile(
  expenseId: string,
  fileId: string,
): Promise<void> {
  return apiRequest<void>(`/expenses/${expenseId}/files/${fileId}`, {
    method: 'DELETE',
  });
}

/** Descarga autenticada de un comprobante (blob). */
export async function downloadExpenseFile(
  expenseId: string,
  fileId: string,
): Promise<Blob> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const headers: Record<string, string> = {};
  const token = readStaffSession()?.accessToken;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(
    `${base}/api/expenses/${expenseId}/files/${fileId}`,
    { headers, credentials: 'include' },
  );
  if (!res.ok) {
    throw new ApiClientError(res.status, null, 'No se pudo abrir el comprobante');
  }
  return res.blob();
}
