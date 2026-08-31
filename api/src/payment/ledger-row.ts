import { CashMovementKind, PaymentMethod, Prisma } from '@prisma/client';
import {
  PAYMENT_LINE_INCLUDE,
  toPaymentLine,
  type PaymentLineDetail,
  type PaymentLineSource,
} from './payment-line';

/**
 * Include del `transaction_item` para armar una fila de caja/reportes.
 *
 * @remarks Recibo de cobro vive en `transaction.receipt`; el de devolución,
 * en `transactionItem.receipt` (RN-PAG-009 / CU-PAG-005).
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
      receipt: { select: { id: true } },
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
    receipt: { id: string } | null;
  } | null;
};

/** Campos mínimos de un movimiento de caja para agrupar por cart + tipo. */
export type LedgerMovementSource = {
  amount: number;
  kind: CashMovementKind;
  createdAt: Date;
  member: { id: string; name: string | null; email: string };
  recordedByStaff: { name: string | null } | null;
  transactionItem: LedgerItemSource;
};

/**
 * Fila de la grilla de movimientos (caja y reportes): 1 cobro o 1 devolución por cart.
 */
export type LedgerMovementRow = {
  id: string;
  transactionId: string;
  receiptId: string | null;
  amount: number;
  method: 'CASH' | 'MP';
  kind: 'INCOME' | 'OUTCOME';
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

/**
 * Agrupa movimientos 1:1 con ítem en una fila por (`transactionId`, kind).
 *
 * @remarks INCOME = cobro del cart; OUTCOME = devolución(es) de ese cart.
 * Más recientes primero.
 */
export function buildLedgerRows(
  rows: LedgerMovementSource[],
): LedgerMovementRow[] {
  const byKey = new Map<string, LedgerMovementRow>();

  for (const row of rows) {
    const item = row.transactionItem;
    const kind: LedgerMovementRow['kind'] =
      row.kind === CashMovementKind.OUTCOME ? 'OUTCOME' : 'INCOME';
    const key = `${item.transactionId}:${kind}`;
    const existing = byKey.get(key);
    const line = toPaymentLine(item);
    const receiptId =
      kind === 'INCOME'
        ? (item.transaction?.receipt?.id ?? item.receipt?.id ?? null)
        : (item.receipt?.id ?? null);

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
