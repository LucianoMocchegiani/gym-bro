import type { ExpenseMethod, ExpenseNature } from '@prisma/client';

/** Etiqueta de gasto del gym. */
export type ExpenseLabelDetail = {
  id: string;
  name: string;
  archived: boolean;
  /** Cantidad de gastos que la usan (con gastos no se borra, se archiva). */
  expenseCount: number;
};

/** Comprobante adjunto (sin URL: se baja con JWT). */
export type ExpenseFileDetail = {
  id: string;
  originalFilename: string;
  mime: string;
  sizeBytes: number;
  createdAt: string;
};

/**
 * Asiento de gasto.
 *
 * @remarks `locked` = efectivo de un día con arqueo cerrado (RN-GAS-006):
 * no se edita ni se borra.
 */
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
  locked: boolean;
  createdAt: string;
};

/** Totales de gastos de un período (Reportes). */
export type ExpensesSummary = {
  from: string;
  to: string;
  total: number;
  count: number;
  byNature: { FIXED: number; VARIABLE: number };
  byMethod: { CASH: number; TRANSFER: number; MP: number; CARD: number };
  /** Ordenado de mayor a menor monto. */
  byLabel: Array<{
    labelId: string;
    name: string;
    total: number;
    count: number;
  }>;
};

/** Bytes de un comprobante para descarga. */
export type ExpenseFileBytes = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};
