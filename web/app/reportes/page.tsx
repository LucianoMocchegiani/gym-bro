'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { DataTable, ListToolbar } from '@/components/AdminList';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { SkeletonCards } from '@/components/Skeleton';
import { memberFichaHref } from '@/lib/member-link';
import { ApiClientError } from '@/lib/api/client';
import { listMembers } from '@/lib/api/members';
import type { MemberDetail } from '@/lib/api/members';
import { getReportsSummary } from '@/lib/api/reports';
import type { ReportsSummary } from '@/lib/api/reports';
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

function memberLabel(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  if (name?.trim()) return name;
  if (email?.trim()) return email;
  return '—';
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
  const [memberQuery, setMemberQuery] = useState('');
  const [memberOptions, setMemberOptions] = useState<MemberDetail[]>([]);
  const [memberSearchBusy, setMemberSearchBusy] = useState(false);

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

  useEffect(() => {
    if (!memberQuery.trim()) {
      setMemberOptions([]);
      return;
    }
    let cancelled = false;
    setMemberSearchBusy(true);
    const timer = setTimeout(async () => {
      try {
        const result = await listMembers({
          q: memberQuery.trim(),
          pageSize: 8,
        });
        if (!cancelled) setMemberOptions(result.items);
      } catch {
        if (!cancelled) setMemberOptions([]);
      } finally {
        if (!cancelled) setMemberSearchBusy(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [memberQuery]);

  function onApply(e: FormEvent) {
    e.preventDefault();
    setAppliedFrom(from);
    setAppliedTo(to);
    setAppliedMemberId(memberId);
  }

  function clearMemberFilter() {
    setMemberId('');
    setMemberQuery('');
    setMemberOptions([]);
    setAppliedMemberId('');
  }

  const payments = data?.income.payments ?? [];
  const paymentCount = data?.income.paymentCount ?? 0;
  const selectedMember = memberId
    ? memberOptions.find((m) => m.id === memberId)
    : null;

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
          <div className="toolbar-field" style={{ position: 'relative' }}>
            <label>
              Afiliado
              <input
                value={memberQuery}
                onChange={(e) => {
                  setMemberQuery(e.target.value);
                  if (!e.target.value) clearMemberFilter();
                }}
                placeholder="Buscar por nombre o email…"
                autoComplete="off"
              />
            </label>
            {memberOptions.length > 0 && memberQuery ? (
              <ul className="autocomplete-list">
                {memberOptions.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className={m.id === memberId ? 'active' : ''}
                      onClick={() => {
                        setMemberId(m.id);
                        setMemberQuery(memberLabel(m.name, m.email));
                        setMemberOptions([]);
                      }}
                    >
                      {memberLabel(m.name, m.email)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {memberSearchBusy ? (
              <span className="muted small">Buscando…</span>
            ) : null}
          </div>
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

      {selectedMember ? (
        <p className="muted small">
          Filtrando por: <strong>{memberLabel(selectedMember.name, selectedMember.email)}</strong>
        </p>
      ) : null}

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
                <Link
                  href={memberFichaHref(
                    p.memberId,
                    p.memberName ?? p.memberEmail ?? '',
                  )}
                >
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
