'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { DashboardKpis, type KpiCardData } from '@/components/DashboardKpis';
import { RequireStaff } from '@/components/RequireStaff';
import {
  KpiIconCash,
  KpiIconDoor,
  KpiIconPack,
  KpiIconPeople,
  KpiIconSession,
} from '@/components/AdminNavIcons';
import { listAccessAttempts } from '@/lib/api/access';
import { ApiClientError } from '@/lib/api/client';
import {
  getCashDay,
  todayBusinessDate,
} from '@/lib/api/payment-register';
import { listMembers } from '@/lib/api/members';
import { getPlatformDashboardKpis } from '@/lib/api/tenants';
import { getReportsSummary } from '@/lib/api/reports';
import { listSessions } from '@/lib/api/sessions';
import { useAuth } from '@/lib/auth/AuthProvider';
import { extractTenantSlugFromHost } from '@/lib/tenant-host';
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

/**
 * Dashboard Admin: hero + KPIs (estilo mockup Inicio).
 *
 * @remarks Solo pide APIs / muestra KPIs según permisos del staff.
 * Vive en `{slug}.localhost`; el apex de plataforma es la landing.
 */
export function DashboardHome() {
  return (
    <RequireStaff>
      <DashboardInner />
    </RequireStaff>
  );
}

/**
 * Elige dashboard según el **host**, no la sesión.
 *
 * @remarks El host es la verdad (la sesión es por origen). `RequireStaff` ya
 * descarta sesiones de otro tenant, pero el slug del host es lo que decide si
 * esta pantalla es la de plataforma.
 */
function DashboardInner() {
  const [hostSlug, setHostSlug] = useState<string | null>(null);

  useEffect(() => {
    setHostSlug(extractTenantSlugFromHost(window.location.host));
  }, []);

  if (hostSlug === null) {
    return <p className="muted">Cargando…</p>;
  }
  if (hostSlug === 'admin') {
    return <AdminDashboard />;
  }
  return <TenantDashboard />;
}

function TenantDashboard() {
  const { session } = useAuth();
  const permissionCodes = session?.permissionCodes ?? null;
  const permissionsReady = permissionCodes !== null;

  const canCaja = canAccessNavHref('/dashboard/caja', permissionCodes);
  const canReports = canAccessNavHref('/dashboard/reportes', permissionCodes);
  const canMembers = canAccessNavHref('/dashboard/afiliados', permissionCodes);
  const canDoor = hasAnyPermission(permissionCodes, ['access.verify']);
  const canSessions = canAccessNavHref('/dashboard/sesiones', permissionCodes);

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
      return;
    }
    if (session?.platformAccess === 'limited') {
      setLoading(false);
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
    session?.platformAccess,
  ]);

  const kpiCards = [
    canMembers || canReports
      ? {
          key: 'members',
          label: 'Afiliados activos',
          value:
            kpi.activeMembers != null ? String(kpi.activeMembers) : '—',
          hint: 'Estado activo',
          icon: <KpiIconPeople />,
        }
      : null,
    canCaja
      ? {
          key: 'income',
          label: 'Ingresos del día',
          value: kpi.income != null ? formatMoney(kpi.income) : '—',
          hint: 'Caja · hoy',
          icon: <KpiIconCash />,
        }
      : null,
    canDoor
      ? {
          key: 'door',
          label: 'Accesos hoy',
          value: kpi.doorAllowed != null ? String(kpi.doorAllowed) : '—',
          hint: 'En tiempo real',
          icon: <KpiIconDoor />,
          live: true,
        }
      : null,
    canReports
      ? {
          key: 'nopack',
          label: 'Sin pack activo',
          value: kpi.withoutPack != null ? String(kpi.withoutPack) : '—',
          hint: 'Afiliados activos sin pack',
          icon: <KpiIconPack />,
        }
      : null,
    canSessions
      ? {
          key: 'sessions',
          label: 'Sesiones hoy',
          value:
            kpi.sessionsToday != null ? String(kpi.sessionsToday) : '—',
          hint: 'Publicadas',
          icon: <KpiIconSession />,
        }
      : null,
  ].filter((c) => c !== null) as KpiCardData[];

  const greetName =
    session?.name?.trim() || session?.email?.split('@')[0] || 'Admin';

  return (
    <AdminShell
      variant="home"
      title={
        <span className="dash-hero-title">
          Hola, <span className="dash-hero-accent">{greetName}</span>
        </span>
      }
      subtitle={
        <p className="dash-hero-sub">
          Tenés el <span className="accent-text">control total</span>.
        </p>
      }
      actions={<p className="muted small toolbar-hint">Hoy · {today}</p>}
    >
      {permissionsReady ? (
        <DashboardKpis loading={loading} cards={kpiCards} errors={kpi.errors} />
      ) : null}
    </AdminShell>
  );
}

/**
 * Inicio del tenant `admin`: mismos KPIs visuales que un gym, métricas de plataforma.
 *
 * @remarks Sin puerta ni sesiones. El analog de afiliados es tenants activos.
 */
function AdminDashboard() {
  const { session } = useAuth();
  const permissionCodes = session?.permissionCodes ?? null;
  const permissionsReady = permissionCodes !== null;
  const canCaja = canAccessNavHref('/dashboard/caja', permissionCodes);
  const canTenants = canAccessNavHref('/dashboard/tenants', permissionCodes);
  const today = todayBusinessDate();

  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState<number | null>(null);
  const [activeGyms, setActiveGyms] = useState<number | null>(null);
  const [withoutPack, setWithoutPack] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!permissionsReady) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const nextErrors: string[] = [];
      let nextIncome: number | null = null;
      let nextGyms: number | null = null;
      let nextWithout: number | null = null;

      if (canTenants) {
        try {
          const kpis = await getPlatformDashboardKpis();
          nextGyms = kpis.activeGyms;
          nextWithout = kpis.withoutActiveTenantContract;
        } catch (err) {
          nextErrors.push(
            err instanceof ApiClientError
              ? `Gyms: ${err.message}`
              : 'Gyms: no disponible',
          );
        }
      }

      if (canCaja) {
        try {
          const day = await getCashDay(today);
          nextIncome = day.totals.income;
        } catch (err) {
          nextErrors.push(
            err instanceof ApiClientError
              ? `Caja: ${err.message}`
              : 'Caja: no disponible',
          );
        }
      }

      if (!cancelled) {
        setIncome(nextIncome);
        setActiveGyms(nextGyms);
        setWithoutPack(nextWithout);
        setErrors(nextErrors);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [permissionsReady, canTenants, canCaja, today]);

  const kpiCards = [
    canTenants
      ? {
          key: 'gyms',
          label: 'Tenants activos',
          value: activeGyms != null ? String(activeGyms) : '—',
          hint: 'Estado activo',
          icon: <KpiIconPeople />,
        }
      : null,
    canCaja
      ? {
          key: 'income',
          label: 'Ingresos del día',
          value: income != null ? formatMoney(income) : '—',
          hint: 'Caja · hoy',
          icon: <KpiIconCash />,
        }
      : null,
    canTenants
      ? {
          key: 'nopack',
          label: 'Sin pack Faciliter',
          value: withoutPack != null ? String(withoutPack) : '—',
          hint: 'Tenants activos sin contrato',
          icon: <KpiIconPack />,
        }
      : null,
  ].filter((c) => c !== null) as KpiCardData[];

  const greetName =
    session?.name?.trim() || session?.email?.split('@')[0] || 'Admin';

  return (
    <AdminShell
      variant="home"
      title={
        <span className="dash-hero-title">
          Hola, <span className="dash-hero-accent">{greetName}</span>
        </span>
      }
      subtitle={
        <p className="dash-hero-sub">
          Tenés el <span className="accent-text">control total</span>.
        </p>
      }
      actions={<p className="muted small toolbar-hint">Hoy · {today}</p>}
    >
      {permissionsReady ? (
        <DashboardKpis loading={loading} cards={kpiCards} errors={errors} />
      ) : null}
    </AdminShell>
  );
}
  