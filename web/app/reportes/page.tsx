'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { DataTable, ListToolbar } from '@/components/AdminList';
import { Panel } from '@/components/AdminUi';
import { MemberPicker } from '@/components/MemberPicker';
import { ReceiptPanel } from '@/components/ReceiptPanel';
import { RequireStaff } from '@/components/RequireStaff';
import { SkeletonCards } from '@/components/Skeleton';
import { StatusPill } from '@/components/StatusPill';
import { IconReceipt, RowIconButton } from '@/components/RowActions';
import { memberFichaHref } from '@/lib/member-link';
import { ApiClientError } from '@/lib/api/client';
import { getReportsSummary } from '@/lib/api/reports';
import type { ReportsSummary, ReportTransactionRow } from '@/lib/api/reports';
import { getReceiptByTransactionItem } from '@/lib/api/receipts';
import type { ReceiptDetail } from '@/lib/api/receipts';
import { formatMoney } from '@/lib/cash-labels';
import { todayBusinessDate } from '@/lib/api/payment-register';

function monthStart(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(iso));
}

function methodLabel(m: string): string {
  if (m === 'CASH') return 'Efectivo';
  if (m === 'MP') return 'MP';
  return m;
}

function conceptLabel(tx: ReportTransactionRow): string {
  if (tx.items.length === 1) {
    const item = tx.items[0];
    return item.kind === 'DROP_IN' ? 'Drop-in' : (item.packName ?? 'Pack');
  }
  return `${tx.items.length} ítems`;
}

export default function ReportesPage() {
  return (
    <RequireStaff>
      <ReportesInner />
    </RequireStaff>
  );
}

function ReportesInner() {
  const searchParams = useSearchParams();
  const initialMemberId = searchParams.get('memberId') ?? '';

  const today = todayBusinessDate();
  const [from, setFrom] = useState(monthStart(today));
  const [to, setTo] = useState(today);
  const [memberId, setMemberId] = useState(initialMemberId);

  const [appliedFrom, setAppliedFrom] = useState(monthStart(today));
  const [appliedTo, setAppliedTo] = useState(today);
  const [appliedMemberId, setAppliedMemberId] = useState(initialMemberId);

  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [receiptBusyId, setReceiptBusyId] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const summary = await getReportsSummary({
          from: appliedFrom,
          to: appliedTo,
          memberId: appliedMemberId || undefined,
        });
        if (!cancelled) {
          setData(summary);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'No se pudieron cargar reportes',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [appliedFrom, appliedTo, appliedMemberId]);

  async function openReceiptForTransactionItem(transactionItemId: string) {
    setReceiptBusyId(transactionItemId);
    try {
      const r = await getReceiptByTransactionItem(transactionItemId);
      setReceipt(r);
    } catch {
      setReceipt(null);
    } finally {
      setReceiptBusyId(null);
    }
  }

  function onApply(e: FormEvent) {
    e.preventDefault();
    setAppliedFrom(from);
    setAppliedTo(to);
    setAppliedMemberId(memberId);
  }

  function clearMemberFilter() {
    setMemberId('');
    setAppliedMemberId('');
  }

  const transactions = data?.income.transactions ?? [];
  const transactionCount = data?.income.transactionCount ?? 0;

  return (
    <AdminShell
      title="Reportes"
      actions={
        <p className="muted small toolbar-hint">
          {appliedFrom} → {appliedTo} · BA
        </p>
      }
    >
      {loading ? <SkeletonCards count={3} /> : null}
      {data && !loading ? (
        <div className="stat-row">
          <Panel className="stat-card">
            <p className="muted small">Afiliados activos</p>
            <p className="stat-value">{data.members.active}</p>
            <p className="muted small">
              Sin pack activo: {data.members.activeWithoutActiveContract}
            </p>
          </Panel>
          <Panel className="stat-card">
            <p className="muted small">Packs activos / vencidos</p>
            <p className="stat-value">
              {data.contracts.active} / {data.contracts.expired}
            </p>
            <p className="muted small">
              Cancelados {data.contracts.cancelled} · Reemb.{' '}
              {data.contracts.refunded}
            </p>
          </Panel>
          <Panel className="stat-card">
            <p className="muted small">Ingresos período</p>
            <p className="stat-value">
              {formatMoney(data.income.totalApproved)}
            </p>
            <p className="muted small">
              Caja {formatMoney(data.income.byMethod.CASH)} · MP{' '}
              {formatMoney(data.income.byMethod.MP)}
            </p>
          </Panel>
        </div>
      ) : null}

      <ListToolbar hint="Ingresos del rango. Afiliados y packs son estado actual.">
        <form className="toolbar-field search-form" onSubmit={onApply}>
          <label>
            Desde
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </label>
          <MemberPicker
            value={memberId}
            onChange={setMemberId}
            label="Afiliado"
            placeholder="Todos"
          />
          {appliedMemberId ? (
            <button
              type="button"
              className="btn ghost"
              onClick={clearMemberFilter}
            >
              Limpiar filtro
            </button>
          ) : null}
          <button type="submit" className="btn ghost" disabled={loading}>
            Aplicar
          </button>
        </form>
      </ListToolbar>

      <DataTable
        title="Movimientos"
        description={
          data && transactionCount > transactions.length
            ? `Mostrando ${transactions.length} de ${transactionCount}`
            : data
              ? `${transactionCount} transacciones`
              : undefined
        }
        loading={loading}
        error={error}
        isEmpty={!loading && !error && transactions.length === 0}
        emptyText="Sin movimientos en el período."
        paginate={false}
        header={
          <>
            <th>Fecha y hora</th>
            <th>Afiliado</th>
            <th>Concepto</th>
            <th>Medio</th>
            <th>Monto</th>
            <th />
          </>
        }
      >
        {transactions.map((tx) => {
          const isExpanded = expandedId === tx.id;
          return (
            <TransactionRow
              key={tx.id}
              tx={tx}
              isExpanded={isExpanded}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              receiptBusyId={receiptBusyId}
              openReceiptForTransactionItem={openReceiptForTransactionItem}
            />
          );
        })}
      </DataTable>

      {receipt ? (
        <ReceiptPanel receipt={receipt} onClose={() => setReceipt(null)} />
      ) : null}
    </AdminShell>
  );
}

function TransactionRow({
  tx,
  isExpanded,
  expandedId,
  setExpandedId,
  receiptBusyId,
  openReceiptForTransactionItem,
}: {
  tx: ReportTransactionRow;
  isExpanded: boolean;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  receiptBusyId: string | null;
  openReceiptForTransactionItem: (id: string) => void;
}) {
  const hasMultiItems = tx.items.length > 1;
  const showExpandable = hasMultiItems && tx.method === 'MP';

  return (
    <>
      <tr
        className={showExpandable ? 'clickable' : undefined}
        onClick={showExpandable ? () => setExpandedId(isExpanded ? null : tx.id) : undefined}
      >
        <td>{formatWhen(tx.createdAt)}</td>
        <td>
          {tx.memberId ? (
            <Link
              href={memberFichaHref(
                tx.memberId,
                tx.memberName ?? tx.memberEmail ?? '',
              )}
            >
              {tx.memberName?.trim() || tx.memberEmail}
            </Link>
          ) : (
            tx.memberName?.trim() || tx.memberEmail || '—'
          )}
        </td>
        <td>{conceptLabel(tx)}</td>
        <td>
          <StatusPill tone={tx.method === 'MP' ? 'ok' : 'warn'}>
            {methodLabel(tx.method)}
          </StatusPill>
          {tx.mpPaymentId ? (
            <span className="muted small" style={{ marginLeft: 6 }}>
              #{tx.mpPaymentId}
            </span>
          ) : null}
        </td>
        <td>{formatMoney(tx.amount)}</td>
        <td className="row-actions">
          {!showExpandable && tx.items.length === 1 ? (
            <RowIconButton
              label="Ver comprobante"
              disabled={receiptBusyId === tx.items[0].id}
              onClick={() => void openReceiptForTransactionItem(tx.items[0].id)}
            >
              <IconReceipt />
            </RowIconButton>
          ) : null}
          {showExpandable ? (
            <span className="muted small">{isExpanded ? '▲' : '▼'}</span>
          ) : null}
        </td>
      </tr>
      {isExpanded && hasMultiItems
        ? tx.items.map((item) => (
            <tr key={item.id} className="sub-row">
              <td />
              <td />
              <td>
                {item.kind === 'DROP_IN' ? 'Drop-in' : (item.packName ?? 'Pack')}
              </td>
              <td>
                <StatusPill tone={item.kind === 'PACK' ? 'ok' : 'warn'}>
                  {item.kind === 'PACK' ? 'Pack' : 'Drop-in'}
                </StatusPill>
              </td>
              <td>{formatMoney(item.amount)}</td>
              <td className="row-actions">
                <RowIconButton
                  label="Ver comprobante"
                  disabled={receiptBusyId === item.id}
                  onClick={() => void openReceiptForTransactionItem(item.id)}
                >
                  <IconReceipt />
                </RowIconButton>
              </td>
            </tr>
          ))
        : null}
    </>
  );
}
