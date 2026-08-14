'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { listAccessAttempts } from '@/lib/api/access';
import {
  getCashDay,
  todayBusinessDate,
} from '@/lib/api/cash-register';
import { ApiClientError } from '@/lib/api/client';
import { listMembers } from '@/lib/api/members';
import { getReportsSummary } from '@/lib/api/reports';
import { listSessions } from '@/lib/api/sessions';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatMoney } from '@/lib/cash-labels';
import {
  canAccessNavHref,
  hasAnyPermission,
} from '@/lib/nav-permissions';

type KpiState = {
  income: number | null;
  activeMembers: number | null;
  withoutPack: number | null;
  doorAllowed: number | null;
  sessionsToday: number | null;
  errors: string[];
};

const SHORTCUTS: { href: string; label: string; hint: string }[] = [
  { href: '/reportes', label: 'Reportes', hint: 'Período e ingresos' },
  { href: '/afiliados', label: 'Afiliados', hint: 'Alta y ficha' },
  { href: '/caja', label: 'Caja', hint: 'Cobros y arqueo' },
  { href: '/devoluciones', label: 'Devoluciones', hint: 'Cola y reembolsos' },
  { href: '/puerta', label: 'Puerta', hint: 'Verificar, pase e historial' },
  { href: '/sesiones', label: 'Sesiones', hint: 'Calendario puntual' },
  { href: '/servicios', label: 'Servicios', hint: 'Catálogo' },
  { href: '/packs', label: 'Packs', hint: 'Planes y créditos' },
  { href: '/roles', label: 'Roles', hint: 'Permisos' },
  { href: '/staff', label: 'Staff', hint: 'Usuarios del gym' },
  { href: '/config', label: 'Config', hint: 'Operación y MP' },
  { href: '/auditoria', label: 'Auditoría', hint: 'Eventos del gym' },
];

/**
 * Dashboard mínimo del Admin (wireframe §7): KPIs del día + atajos.
 *
 * @remarks Solo pide APIs / muestra KPIs según permisos del staff.
 */
export default function DashboardPage() {
  return (
    <RequireStaff>
      <DashboardInner />
    </RequireStaff>
  );
}

function DashboardInner() {
  const { session } = useAuth();
  const permissionCodes = session?.permissionCodes ?? null;
  const permissionsReady = permissionCodes !== null;

  const canCaja = canAccessNavHref('/caja', permissionCodes);
  const canReports = canAccessNavHref('/reportes', permissionCodes);
  const canMembers = canAccessNavHref('/afiliados', permissionCodes);
  const canDoor = hasAnyPermission(permissionCodes, ['access.verify']);
  const canSessions = canAccessNavHref('/sesiones', permissionCodes);

  const shortcuts = useMemo(
    () =>
      SHORTCUTS.filter((s) => canAccessNavHref(s.href, permissionCodes)),
    [permissionCodes],
  );
  const today = todayBusinessDate();
  const [kpi, setKpi] = useState<KpiState>({
    income: null,
    activeMembers: null,
    withoutPack: null,
    doorAllowed: null,
    sessionsToday: null,
    errors: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!permissionsReady) {
      setLoading(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      const errors: string[] = [];
      let income: number | null = null;
      let activeMembers: number | null = null;
      let withoutPack: number | null = null;
      let doorAllowed: number | null = null;
      let sessionsToday: number | null = null;

      if (canCaja) {
        try {
          const day = await getCashDay(today);
          income = day.totals.income;
        } catch (err) {
          errors.push(
            err instanceof ApiClientError
              ? `Caja: ${err.message}`
              : 'Caja: no disponible',
          );
        }
      }

      if (canMembers && !canReports) {
        try {
          const members = await listMembers({ status: 'ACTIVE', pageSize: 1 });
          activeMembers = members.total;
        } catch (err) {
          errors.push(
            err instanceof ApiClientError
              ? `Afiliados: ${err.message}`
              : 'Afiliados: no disponible',
          );
        }
      }

      if (canReports) {
        try {
          const summary = await getReportsSummary({ from: today, to: today });
          withoutPack = summary.members.activeWithoutActiveContract;
          activeMembers = summary.members.active;
        } catch (err) {
          errors.push(
            err instanceof ApiClientError
              ? `Reportes: ${err.message}`
              : 'Reportes: no disponible',
          );
        }
      }

      if (canDoor) {
        try {
          const attempts = await listAccessAttempts({
            pageSize: 1,
            result: 'ALLOWED',
            from: today,
            to: today,
          });
          doorAllowed = attempts.total;
        } catch (err) {
          errors.push(
            err instanceof ApiClientError
              ? `Puerta: ${err.message}`
              : 'Puerta: no disponible',
          );
        }
      }

      if (canSessions) {
        try {
          const dayStart = `${today}T00:00:00.000-03:00`;
          const dayEnd = `${today}T23:59:59.999-03:00`;
          const sessions = await listSessions({
            from: new Date(dayStart).toISOString(),
            to: new Date(dayEnd).toISOString(),
            status: 'PUBLISHED',
            pageSize: 1,
          });
          sessionsToday = sessions.total;
        } catch (err) {
          errors.push(
            err instanceof ApiClientError
              ? `Sesiones: ${err.message}`
              : 'Sesiones: no disponible',
          );
        }
      }

      if (!cancelled) {
        setKpi({
          income,
          activeMembers,
          withoutPack,
          doorAllowed,
          sessionsToday,
          errors,
        });
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    today,
    permissionsReady,
    canCaja,
    canReports,
    canMembers,
    canDoor,
    canSessions,
  ]);

  const showKpis =
    canCaja || canMembers || canReports || canDoor || canSessions;

  return (
    <AdminShell
      title="Inicio"
      actions={
        <p className="muted small toolbar-hint">Hoy · {today}</p>
      }
    >
      {!permissionsReady || loading ? (
        <p className="muted">Cargando…</p>
      ) : null}
      {permissionsReady && !loading && kpi.errors.length > 0 ? (
        <p className="error">{kpi.errors.join(' · ')}</p>
      ) : null}

      {permissionsReady && !loading ? (
        <>
          {showKpis ? (
            <div className="stat-row dash-kpis">
              {canCaja ? (
                <Panel className="stat-card">
                  <p className="muted small">Ingresos caja</p>
                  <p className="stat-value">
                    {kpi.income != null ? formatMoney(kpi.income) : '—'}
                  </p>
                </Panel>
              ) : null}
              {canMembers || canReports ? (
                <Panel className="stat-card">
                  <p className="muted small">Afiliados activos</p>
                  <p className="stat-value">
                    {kpi.activeMembers != null ? kpi.activeMembers : '—'}
                  </p>
                </Panel>
              ) : null}
              {canReports ? (
                <Panel className="stat-card">
                  <p className="muted small">Sin pack activo</p>
                  <p className="stat-value">
                    {kpi.withoutPack != null ? kpi.withoutPack : '—'}
                  </p>
                  <p className="muted small">Proxy deuda · ver Reportes</p>
                </Panel>
              ) : null}
              {canDoor ? (
                <Panel className="stat-card">
                  <p className="muted small">Ingresos puerta</p>
                  <p className="stat-value">
                    {kpi.doorAllowed != null ? kpi.doorAllowed : '—'}
                  </p>
                  <p className="muted small">ALLOWED hoy</p>
                </Panel>
              ) : null}
              {canSessions ? (
                <Panel className="stat-card">
                  <p className="muted small">Sesiones hoy</p>
                  <p className="stat-value">
                    {kpi.sessionsToday != null ? kpi.sessionsToday : '—'}
                  </p>
                </Panel>
              ) : null}
            </div>
          ) : (
            <p className="muted">
              No hay KPIs disponibles con tus permisos. Usá los atajos de
              abajo.
            </p>
          )}

          <Panel
            title="Atajos"
            description="Solo se muestran módulos permitidos por tu rol."
            className="dash-shortcuts-panel"
          >
            <div className="dash-shortcuts">
              {shortcuts.length === 0 ? (
                <p className="muted">Sin atajos para tu rol.</p>
              ) : (
                shortcuts.map((s) => (
                  <Link key={s.href} href={s.href} className="dash-shortcut">
                    <span className="dash-shortcut-label">{s.label}</span>
                    <span className="muted small">{s.hint}</span>
                  </Link>
                ))
              )}
            </div>
          </Panel>
        </>
      ) : null}
    </AdminShell>
  );
}
