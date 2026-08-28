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
import type { ReportsSummary } from '@/lib/api/reports';
import { getReceiptByPayment } from '@/lib/api/receipts';
import type { ReceiptDetail } from '@/lib/api/receipts';
import { formatMoney } from '@/lib/cash-labels';
import { todayBusinessDate } from '@/lib/api/cash-register';

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

function formatConcept(p: { kind: string; packName: string | null }): string {
  if (p.kind === 'DROP_IN') return 'Drop-in';
  return p.packName ?? 'Pack';
}

function methodLabel(m: string): string {
  if (m === 'CASH') return 'Efectivo';
  if (m === 'MP') return 'Mercado Pago';
  if (m === 'STUB') return 'Stub';
  return m;
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

  async function openReceiptForPayment(paymentId: string) {
    setReceiptBusyId(paymentId);
    try {
      const r = await getReceiptByPayment(paymentId);
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

  const payments = data?.income.payments ?? [];
  const paymentCount = data?.income.paymentCount ?? 0;

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
              {formatMoney(data.income.byMethod.MP)} · Stub{' '}
              {formatMoney(data.income.byMethod.STUB)}
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
        title="Ingresos (detalle)"
        description={
          data && paymentCount > payments.length
            ? `Mostrando ${payments.length} de ${paymentCount}`
            : data
              ? `${paymentCount} pagos aprobados`
              : undefined
        }
        loading={loading}
        error={error}
        isEmpty={!loading && !error && payments.length === 0}
        emptyText="Sin pagos en el período."
        paginate={false}
        header={
          <>
            <th>Fecha y hora</th>
            <th>Afiliado</th>
            <th>Concepto</th>
            <th>Medio</th>
            <th>Tipo</th>
            <th>Monto</th>
            <th />
          </>
        }
      >
        {payments.map((p) => (
          <tr key={p.id}>
            <td>{formatWhen(p.createdAt)}</td>
            <td>
              {p.memberId ? (
                <Link
                  href={memberFichaHref(
                    p.memberId,
                    p.memberName ?? p.memberEmail ?? '',
                  )}
                >
                  {p.memberName?.trim() || p.memberEmail}
                </Link>
              ) : (
                p.memberName?.trim() || p.memberEmail || '—'
              )}
            </td>
            <td>{formatConcept(p)}</td>
            <td>{methodLabel(p.method)}</td>
            <td>
              <StatusPill tone={p.kind === 'PACK' ? 'ok' : 'warn'}>
                {p.kind === 'PACK' ? 'Pack' : 'Drop-in'}
              </StatusPill>
            </td>
            <td>{formatMoney(p.amount)}</td>
            <td className="row-actions">
              <RowIconButton
                label="Ver comprobante"
                disabled={receiptBusyId === p.id}
                onClick={() => void openReceiptForPayment(p.id)}
              >
                <IconReceipt />
              </RowIconButton>
            </td>
          </tr>
        ))}
      </DataTable>

      {receipt ? (
        <ReceiptPanel receipt={receipt} onClose={() => setReceipt(null)} />
      ) : null}
    </AdminShell>
  );
}
