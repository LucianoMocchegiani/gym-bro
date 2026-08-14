'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/AdminShell';
import { DataTable, ListToolbar } from '@/components/AdminList';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { getReportsSummary } from '@/lib/api/reports';
import type { ReportsSummary } from '@/lib/api/reports';
import { formatMoney } from '@/lib/cash-labels';
import { todayBusinessDate } from '@/lib/api/cash-register';

/**
 * Primer día del mes de un YMD.
 */
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

function memberLabel(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  if (name?.trim()) {
    return name;
  }
  if (email?.trim()) {
    return email;
  }
  return '—';
}

/**
 * Reportes de ingresos del gym (E11). Historial de puerta → `/puerta`.
 */
export default function ReportesPage() {
  return (
    <RequireStaff>
      <ReportesInner />
    </RequireStaff>
  );
}

function ReportesInner() {
  const today = todayBusinessDate();
  const [from, setFrom] = useState(monthStart(today));
  const [to, setTo] = useState(today);
  const [appliedFrom, setAppliedFrom] = useState(monthStart(today));
  const [appliedTo, setAppliedTo] = useState(today);
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
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appliedFrom, appliedTo]);

  function onApply(e: FormEvent) {
    e.preventDefault();
    setAppliedFrom(from);
    setAppliedTo(to);
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
      {data && !loading ? (
        <div className="stat-row dash-kpis">
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

      <ListToolbar hint="Ingresos del rango. Afiliados y packs son estado actual. Historial de accesos en Puerta.">
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
            <th>Fecha</th>
            <th>Afiliado</th>
            <th>Concepto</th>
            <th>Medio</th>
            <th>Monto</th>
          </>
        }
      >
        {payments.map((p) => (
          <tr key={p.id}>
            <td>{formatWhen(p.createdAt)}</td>
            <td>
              {p.memberId ? (
                <Link href={`/afiliados/${p.memberId}`}>
                  {memberLabel(p.memberName, p.memberEmail)}
                </Link>
              ) : (
                memberLabel(p.memberName, p.memberEmail)
              )}
            </td>
            <td>
              {p.kind === 'DROP_IN' ? 'Drop-in' : (p.packName ?? 'Pack')}
            </td>
            <td>{p.method}</td>
            <td>{formatMoney(p.amount)}</td>
          </tr>
        ))}
      </DataTable>
    </AdminShell>
  );
}
