'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DataTable } from '@/components/AdminList';
import { PaymentLineCopy } from '@/components/PaymentLineCopy';
import {
  ReceiptPanel,
  formatDiscountPercent,
} from '@/components/ReceiptPanel';
import { RefundExecuteModal } from '@/components/RefundExecuteModal';
import { StatusPill } from '@/components/StatusPill';
import { MpPaymentStatusModal } from '@/components/MpPaymentStatus';
import {
  IconReceipt,
  IconRefund,
  IconWallet,
  RowIconButton,
} from '@/components/RowActions';
import { ApiClientError } from '@/lib/api/client';
import type { LedgerMovementRow } from '@/lib/api/ledger';
import { getReceipt, getReceiptByTransaction } from '@/lib/api/receipts';
import type { ReceiptDetail } from '@/lib/api/receipts';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatMoney, ledgerCategoryLabel } from '@/lib/cash-labels';
import { memberFichaHref } from '@/lib/member-link';

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(iso));
}

function methodLabel(m: LedgerMovementRow['method']): string {
  if (m === 'CASH') return 'Efectivo';
  if (m === 'MP') return 'MP';
  if (m === 'TRANSFER') return 'Transferencia';
  return m;
}

function RowDiscount({ row }: { row: LedgerMovementRow }) {
  if (row.kind !== 'INCOME') return null;
  const percents = row.items.map((i) => i.discountPercent ?? null);
  const first = percents[0] ?? null;
  if (first === null || percents.some((p) => p !== first)) return null;
  return (
    <span className="muted small" style={{ marginLeft: 6 }}>
      −{formatDiscountPercent(first)}
    </span>
  );
}

function conceptLabel(row: LedgerMovementRow): string {
  if (row.items.length === 1) {
    return row.items[0]?.title ?? '—';
  }
  return `${row.items.length} ítems`;
}

/**
 * Grilla de cobros y devoluciones (ingreso = cart; egreso = ejecución).
 *
 * @remarks Misma tabla en `/dashboard/reportes` y `/dashboard/arqueo` (CU-PAG-003 / E11).
 * Devolver solo se ofrece en Arqueo (`allowRefund`).
 */
export function MoneyMovementsTable({
  rows,
  loading,
  error,
  description,
  emptyText = 'Sin movimientos.',
  title = 'Movimientos',
  allowRefund = false,
  onRefunded,
}: {
  rows: LedgerMovementRow[];
  loading: boolean;
  error: string | null;
  description?: string;
  emptyText?: string;
  title?: string;
  /** Acción Devolver (Arqueo; permiso `transaction_items.refund`). */
  allowRefund?: boolean;
  onRefunded?: () => void;
}) {
  const { session } = useAuth();
  const canRefund =
    allowRefund &&
    (session?.permissionCodes?.includes('transaction_items.refund') ?? false);
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [receiptBusyId, setReceiptBusyId] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [refundRow, setRefundRow] = useState<LedgerMovementRow | null>(null);
  const [mpTransactionId, setMpTransactionId] = useState<string | null>(null);

  async function openReceipt(row: LedgerMovementRow) {
    setReceiptBusyId(row.id);
    setReceiptError(null);
    try {
      const r = row.receiptId
        ? await getReceipt(row.receiptId)
        : await getReceiptByTransaction(row.transactionId);
      setReceipt(r);
    } catch (err) {
      setReceipt(null);
      setReceiptError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cargar el comprobante',
      );
    } finally {
      setReceiptBusyId(null);
    }
  }

  return (
    <>
      <DataTable
        title={title}
        description={description}
        loading={loading}
        error={error}
        isEmpty={!loading && !error && rows.length === 0}
        emptyText={emptyText}
        paginate={false}
        header={
          <>
            <th>Fecha y hora</th>
            <th>
              {rows.some((r) => r.billedTenantName) ? 'Cliente' : 'Afiliado'}
            </th>
            <th>Concepto</th>
            <th>Categoría</th>
            <th>Tipo</th>
            <th>Medio</th>
            <th>Monto</th>
            <th>Staff</th>
            <th />
          </>
        }
      >
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{formatWhen(row.createdAt)}</td>
            <td>
              {row.memberId ? (
                <Link
                  href={memberFichaHref(
                    row.memberId,
                    row.memberName ?? row.memberEmail ?? '',
                  )}
                >
                  {row.memberName?.trim() || row.memberEmail}
                </Link>
              ) : (
                row.billedTenantName ||
                row.memberName?.trim() ||
                row.memberEmail ||
                '—'
              )}
            </td>
            <td>
              {row.items.length === 1 && row.items[0] ? (
                <PaymentLineCopy line={row.items[0]} />
              ) : (
                conceptLabel(row)
              )}
            </td>
            <td>
              <StatusPill
                tone={row.category === 'REFUND' ? 'warn' : 'ok'}
              >
                {ledgerCategoryLabel(
                  row.category ?? (row.kind === 'OUTCOME' ? 'REFUND' : 'SALE'),
                )}
              </StatusPill>
            </td>
            <td>
              <StatusPill tone={row.kind === 'INCOME' ? 'ok' : 'danger'}>
                {row.kind === 'INCOME' ? 'Ingreso' : 'Egreso'}
              </StatusPill>
            </td>
            <td>
              <StatusPill tone={row.method === 'MP' ? 'ok' : 'warn'}>
                {methodLabel(row.method)}
              </StatusPill>
              {row.mpPaymentId ? (
                <span className="muted small" style={{ marginLeft: 6 }}>
                  #{row.mpPaymentId}
                </span>
              ) : null}
              {row.transferReference ? (
                <span className="muted small" style={{ marginLeft: 6 }}>
                  {row.transferReference}
                </span>
              ) : null}
            </td>
            <td>
              {formatMoney(row.amount)}
              <RowDiscount row={row} />
            </td>
            <td>{row.recordedByStaffName ?? '—'}</td>
            <td className="row-actions">
              {canRefund &&
              row.kind === 'INCOME' &&
              row.refundable !== false &&
              row.items.some((i) => (i.status ?? 'APPROVED') === 'APPROVED') ? (
                <RowIconButton
                  label="Devolver"
                  onClick={() => setRefundRow(row)}
                >
                  <IconRefund />
                </RowIconButton>
              ) : null}
              {row.kind === 'INCOME' &&
              row.method === 'MP' &&
              row.mpPaymentId &&
              row.refundable !== false ? (
                <RowIconButton
                  label="Estado en Mercado Pago"
                  onClick={() => setMpTransactionId(row.transactionId)}
                >
                  <IconWallet />
                </RowIconButton>
              ) : null}
              <RowIconButton
                label="Ver comprobante"
                disabled={!!receiptBusyId}
                onClick={() => void openReceipt(row)}
              >
                <IconReceipt />
              </RowIconButton>
            </td>
          </tr>
        ))}
      </DataTable>

      {receiptError ? <p className="error">{receiptError}</p> : null}

      {receipt ? (
        <ReceiptPanel
          receipt={receipt}
          onClose={() => setReceipt(null)}
          showMpStatus
        />
      ) : null}

      {mpTransactionId ? (
        <MpPaymentStatusModal
          transactionId={mpTransactionId}
          onClose={() => setMpTransactionId(null)}
        />
      ) : null}

      {refundRow ? (
        <RefundExecuteModal
          key={refundRow.id}
          open
          transactionId={refundRow.transactionId}
          items={refundRow.items}
          onClose={() => setRefundRow(null)}
          onDone={() => {
            setRefundRow(null);
            onRefunded?.();
          }}
        />
      ) : null}
    </>
  );
}
