'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { ListToolbar } from '@/components/AdminList';
import { Panel } from '@/components/AdminUi';
import { MemberPicker } from '@/components/MemberPicker';
import { MoneyMovementsTable } from '@/components/MoneyMovementsTable';
import { RequireStaff } from '@/components/RequireStaff';
import { SkeletonCards } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import { getReportsSummary } from '@/lib/api/reports';
import type { ReportsSummary } from '@/lib/api/reports';
import { formatMoney } from '@/lib/cash-labels';
import { todayBusinessDate } from '@/lib/api/payment-register';

function monthStart(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
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
  const totalRefunded = data?.income.totalRefunded ?? 0;

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
              {totalRefunded > 0
                ? ` · Dev. ${formatMoney(totalRefunded)}`
                : ''}
            </p>
          </Panel>
        </div>
      ) : null}

      <ListToolbar hint="Cobros y devoluciones del rango. Afiliados y packs son estado actual.">
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

      <MoneyMovementsTable
        rows={transactions}
        loading={loading}
        error={error}
        description={
          data ? `${transactionCount} movimientos` : undefined
        }
        emptyText="Sin movimientos en el período."
      />
    </AdminShell>
  );
}
