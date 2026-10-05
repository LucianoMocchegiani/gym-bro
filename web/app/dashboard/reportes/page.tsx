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
import { getExpensesSummary, type ExpensesSummary } from '@/lib/api/expenses';
import { getReportsSummary } from '@/lib/api/reports';
import type { ReportsSummary } from '@/lib/api/reports';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatMoney } from '@/lib/cash-labels';
import { todayBusinessDate } from '@/lib/api/payment-register';
import { hasAllPermissions } from '@/lib/nav-permissions';

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

  const { session } = useAuth();
  const canSeeExpenses = hasAllPermissions(session?.permissionCodes, [
    'expenses.read',
  ]);

  const [data, setData] = useState<ReportsSummary | null>(null);
  const [expenses, setExpenses] = useState<ExpensesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [summary, expenseSummary] = await Promise.all([
          getReportsSummary({
            from: appliedFrom,
            to: appliedTo,
            memberId: appliedMemberId || undefined,
          }),
          canSeeExpenses && !appliedMemberId
            ? getExpensesSummary({ from: appliedFrom, to: appliedTo }).catch(
                () => null,
              )
            : Promise.resolve(null),
        ]);
        if (!cancelled) {
          setData(summary);
          setExpenses(expenseSummary);
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
  }, [appliedFrom, appliedTo, appliedMemberId, canSeeExpenses]);

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
              Efectivo {formatMoney(data.income.byMethod.CASH)} · Transf.{' '}
              {formatMoney(data.income.byMethod.TRANSFER ?? 0)} · MP{' '}
              {formatMoney(data.income.byMethod.MP)}
              {totalRefunded > 0
                ? ` · Dev. ${formatMoney(totalRefunded)}`
                : ''}
            </p>
            {data.income.totalDiscounts ? (
              <p className="muted small">
                Descuentos en Caja {formatMoney(data.income.totalDiscounts)}
              </p>
            ) : null}
          </Panel>
        </div>
      ) : null}

      {data && expenses && !loading ? (
        <Panel
          title="Gastos y resultado"
          description="Resultado simple del período: ingresos − devoluciones − gastos."
        >
          <div className="stat-row expense-stats">
            <div className="stat-card">
              <p className="muted small">Gastos</p>
              <p className="stat-value">{formatMoney(expenses.total)}</p>
              <p className="muted small">
                Fijos {formatMoney(expenses.byNature.FIXED)} · Variables{' '}
                {formatMoney(expenses.byNature.VARIABLE)}
              </p>
            </div>
            <div className="stat-card">
              <p className="muted small">Resultado</p>
              <p className="stat-value">
                {formatMoney(
                  data.income.totalApproved - totalRefunded - expenses.total,
                )}
              </p>
              <p className="muted small">
                {formatMoney(data.income.totalApproved)} −{' '}
                {formatMoney(totalRefunded)} − {formatMoney(expenses.total)}
              </p>
            </div>
          </div>
          {expenses.byLabel.length ? (
            <ul className="expense-by-label">
              {expenses.byLabel.map((l) => (
                <li key={l.labelId}>
                  <span>{l.name}</span>
                  <strong>{formatMoney(l.total)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Sin gastos en el período.</p>
          )}
        </Panel>
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
