'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
import { formatMoney } from '@/lib/cash-labels';

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
  { href: '/puerta', label: 'Puerta', hint: 'Verify e historial' },
  { href: '/sesiones', label: 'Sesiones', hint: 'Calendario puntual' },
  { href: '/servicios', label: 'Servicios', hint: 'Catálogo' },
  { href: '/packs', label: 'Packs', hint: 'Planes y créditos' },
  { href: '/roles', label: 'Roles', hint: 'Permisos' },
  { href: '/staff', label: 'Staff', hint: 'Usuarios del gym' },
  { href: '/config', label: 'Config', hint: 'Operación y MP' },
];

/**
 * Dashboard mínimo del Admin (wireframe §7): KPIs del día + atajos.
 */
export default function DashboardPage() {
  return (
    <RequireStaff>
      <DashboardInner />
    </RequireStaff>
  );
}

function DashboardInner() {
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
    let cancelled = false;
    void (async () => {
      const errors: string[] = [];
      let income: number | null = null;
      let activeMembers: number | null = null;
      let withoutPack: number | null = null;
      let doorAllowed: number | null = null;
      let sessionsToday: number | null = null;

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

      try {
        const members = await listMembers('ACTIVE');
        activeMembers = members.length;
      } catch (err) {
        errors.push(
          err instanceof ApiClientError
            ? `Afiliados: ${err.message}`
            : 'Afiliados: no disponible',
        );
      }

      try {
        const summary = await getReportsSummary({ from: today, to: today });
        withoutPack = summary.members.activeWithoutActiveContract;
        if (activeMembers == null) {
          activeMembers = summary.members.active;
        }
      } catch (err) {
        errors.push(
          err instanceof ApiClientError
            ? `Reportes: ${err.message}`
            : 'Reportes: no disponible',
        );
      }

      try {
        const attempts = await listAccessAttempts({
          limit: 100,
          result: 'ALLOWED',
          from: today,
          to: today,
        });
        doorAllowed = attempts.length;
      } catch (err) {
        errors.push(
          err instanceof ApiClientError
            ? `Puerta: ${err.message}`
            : 'Puerta: no disponible',
        );
      }

      try {
        const dayStart = `${today}T00:00:00.000-03:00`;
        const dayEnd = `${today}T23:59:59.999-03:00`;
        const sessions = await listSessions({
          from: new Date(dayStart).toISOString(),
          to: new Date(dayEnd).toISOString(),
          status: 'PUBLISHED',
        });
        sessionsToday = sessions.length;
      } catch (err) {
        errors.push(
          err instanceof ApiClientError
            ? `Sesiones: ${err.message}`
            : 'Sesiones: no disponible',
        );
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
  }, [today]);

  return (
    <AdminShell
      title="Inicio"
      actions={
        <p className="muted small toolbar-hint">Hoy · {today}</p>
      }
    >
      {loading ? <p className="muted">Cargando…</p> : null}
      {kpi.errors.length > 0 ? (
        <p className="error">{kpi.errors.join(' · ')}</p>
      ) : null}

      {!loading ? (
        <>
          <div className="stat-row dash-kpis">
            <Panel className="stat-card">
              <p className="muted small">Ingresos caja</p>
              <p className="stat-value">
                {kpi.income != null ? formatMoney(kpi.income) : '—'}
              </p>
            </Panel>
            <Panel className="stat-card">
              <p className="muted small">Afiliados activos</p>
              <p className="stat-value">
                {kpi.activeMembers != null ? kpi.activeMembers : '—'}
              </p>
            </Panel>
            <Panel className="stat-card">
              <p className="muted small">Sin pack activo</p>
              <p className="stat-value">
                {kpi.withoutPack != null ? kpi.withoutPack : '—'}
              </p>
              <p className="muted small">Proxy deuda · ver Reportes</p>
            </Panel>
            <Panel className="stat-card">
              <p className="muted small">Ingresos puerta</p>
              <p className="stat-value">
                {kpi.doorAllowed != null ? kpi.doorAllowed : '—'}
              </p>
              <p className="muted small">ALLOWED hoy (últ. 100)</p>
            </Panel>
            <Panel className="stat-card">
              <p className="muted small">Sesiones hoy</p>
              <p className="stat-value">
                {kpi.sessionsToday != null ? kpi.sessionsToday : '—'}
              </p>
            </Panel>
          </div>

          <Panel
            title="Atajos"
            description="Detalle de período e ingresos nominados en Reportes."
            className="dash-shortcuts-panel"
          >
            <div className="dash-shortcuts">
              {SHORTCUTS.map((s) => (
                <Link key={s.href} href={s.href} className="dash-shortcut">
                  <span className="dash-shortcut-label">{s.label}</span>
                  <span className="muted small">{s.hint}</span>
                </Link>
              ))}
            </div>
          </Panel>
        </>
      ) : null}
    </AdminShell>
  );
}
