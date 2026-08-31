import { CashMovementKind, PaymentMethod, Prisma, ReceiptConcept } from '@prisma/client';
import {
  PAYMENT_LINE_INCLUDE,
  toPaymentLine,
  type PaymentLineDetail,
  type PaymentLineSource,
} from './payment-line';

/**
 * Include del `transaction_item` para armar una fila de caja/reportes.
 *
 * @remarks Recibo de cobro vive en `transaction.receipts` (`concept <> REFUND`);
 * el de devolución, en `cash_movements.receipt_id` (1 por ejecución).
 */
export const LEDGER_ITEM_INCLUDE = {
  pack: PAYMENT_LINE_INCLUDE.pack,
  session: PAYMENT_LINE_INCLUDE.session,
  contract: PAYMENT_LINE_INCLUDE.contract,
  reservation: PAYMENT_LINE_INCLUDE.reservation,
  receipt: { select: { id: true } },
  transaction: {
    select: {
      id: true,
      mpPaymentId: true,
      receipts: {
        where: { concept: { not: ReceiptConcept.REFUND } },
        select: { id: true },
        take: 1,
      },
    },
  },
} satisfies Prisma.TransactionItemInclude;

/** Include de un `cash_movement` para `buildLedgerRows`. */
export const LEDGER_MOVEMENT_INCLUDE = {
  member: { select: { id: true, name: true, email: true } },
  recordedByStaff: { select: { id: true, name: true } },
  transactionItem: { include: LEDGER_ITEM_INCLUDE },
} satisfies Prisma.CashMovementInclude;

type LedgerItemSource = PaymentLineSource & {
  method: PaymentMethod;
  mpPaymentId: string | null;
  transactionId: string;
  receipt: { id: string } | null;
  transaction: {
    id: string;
    mpPaymentId: string | null;
    receipts: Array<{ id: string }>;
  } | null;
};

/** Campos mínimos de un movimiento de caja para agrupar por cart + tipo. */
export type LedgerMovementSource = {
  amount: number;
  kind: CashMovementKind;
  createdAt: Date;
  receiptId: string | null;
  member: { id: string; name: string | null; email: string };
  recordedByStaff: { name: string | null } | null;
  transactionItem: LedgerItemSource;
};

/**
 * Categoría comercial de un asiento de caja (independiente de ingreso/egreso).
 *
 * @remarks Hoy: venta (cobro) y devolución. Post-MVP: compra, gasto-expensas,
 * gasto-empleados (`docs/99-backlog-post-mvp.md`).
 */
export type LedgerCategory = 'SALE' | 'REFUND';

/**
 * Fila de la grilla de movimientos (caja y reportes).
 *
 * @remarks INCOME = 1 cobro (cart). OUTCOME = 1 ejecución de devolución
 * (puede ser un subconjunto del cart). `category` es el rubro (venta vs
 * devolución); `kind` es el sentido del dinero.
 */
export type LedgerMovementRow = {
  id: string;
  transactionId: string;
  receiptId: string | null;
  amount: number;
  method: 'CASH' | 'MP';
  kind: 'INCOME' | 'OUTCOME';
  category: LedgerCategory;
  createdAt: Date;
  memberId: string;
  memberName: string | null;
  memberEmail: string;
  recordedByStaffName: string | null;
  mpPaymentId: string | null;
  items: PaymentLineDetail[];
};

function methodLabel(method: PaymentMethod): 'CASH' | 'MP' {
  return method === PaymentMethod.MP ? 'MP' : 'CASH';
}

function categoryFromKind(kind: CashMovementKind): LedgerCategory {
  return kind === CashMovementKind.OUTCOME ? 'REFUND' : 'SALE';
}

/**
 * Agrupa ingresos por cart y egresos por ejecución de devolución.
 *
 * @remarks INCOME clave = transactionId. OUTCOME clave = receiptId del lote
 * (legacy: recibo del ítem o timestamp). Más recientes primero.
 */
export function buildLedgerRows(
  rows: LedgerMovementSource[],
): LedgerMovementRow[] {
  const byKey = new Map<string, LedgerMovementRow>();

  for (const row of rows) {
    const item = row.transactionItem;
    const kind: LedgerMovementRow['kind'] =
      row.kind === CashMovementKind.OUTCOME ? 'OUTCOME' : 'INCOME';
    const category = categoryFromKind(row.kind);
    const chargeReceiptId = item.transaction?.receipts[0]?.id ?? null;
    const outcomeReceiptId =
      row.receiptId ?? item.receipt?.id ?? null;
    const key =
      kind === 'INCOME'
        ? `in:${item.transactionId}`
        : `out:${outcomeReceiptId ?? `${item.transactionId}:${row.createdAt.getTime()}`}`;
    const existing = byKey.get(key);
    const line = toPaymentLine(item);
    const receiptId =
      kind === 'INCOME' ? chargeReceiptId ?? item.receipt?.id ?? null : outcomeReceiptId;

    if (existing) {
      existing.amount += row.amount;
      existing.items.push(line);
      if (!existing.receiptId && receiptId) {
        existing.receiptId = receiptId;
      }
      if (!existing.recordedByStaffName && row.recordedByStaff?.name) {
        existing.recordedByStaffName = row.recordedByStaff.name;
      }
      if (!existing.mpPaymentId) {
        existing.mpPaymentId =
          item.transaction?.mpPaymentId ?? item.mpPaymentId;
      }
      if (row.createdAt.getTime() < existing.createdAt.getTime()) {
        existing.createdAt = row.createdAt;
      }
      continue;
    }

    byKey.set(key, {
      id: key,
      transactionId: item.transactionId,
      receiptId,
      amount: row.amount,
      method: methodLabel(item.method),
      kind,
      category,
      createdAt: row.createdAt,
      memberId: row.member.id,
      memberName: row.member.name,
      memberEmail: row.member.email,
      recordedByStaffName: row.recordedByStaff?.name ?? null,
      mpPaymentId: item.transaction?.mpPaymentId ?? item.mpPaymentId,
      items: [line],
    });
  }

  const all = [...byKey.values()];
  all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return all;
}
