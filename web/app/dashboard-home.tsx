'use client';

import { useEffect, useState } from 'react';
import {
  DataTable,
  ListPagination,
  ListToolbar,
  listCountDescription,
} from '@/components/AdminList';
import { AdminModal } from '@/components/AdminModal';
import { AdminShell } from '@/components/AdminShell';
import { DashboardKpis, type KpiCardData } from '@/components/DashboardKpis';
import { RequireStaff } from '@/components/RequireStaff';
import { ImpersonateTenantPanel } from '@/components/ImpersonateTenantPanel';
import {
  KpiIconCash,
  KpiIconDoor,
  KpiIconPack,
  KpiIconPeople,
  KpiIconSession,
} from '@/components/AdminNavIcons';
import {
  IconEdit,
  IconView,
  RowActions,
  RowIconButton,
} from '@/components/RowActions';
import { listAccessAttempts } from '@/lib/api/access';
import { ApiClientError } from '@/lib/api/client';
import {
  getCashDay,
  todayBusinessDate,
} from '@/lib/api/payment-register';
import { listMembers } from '@/lib/api/members';
import { listPlatformTenants } from '@/lib/api/tenants';
import type { PlatformTenantSummary } from '@/lib/api/tenants';
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

  const canCaja = canAccessNavHref('/caja', permissionCodes);
  const canReports = canAccessNavHref('/reportes', permissionCodes);
  const canMembers = canAccessNavHref('/afiliados', permissionCodes);
  const canDoor = hasAnyPermission(permissionCodes, ['access.verify']);
  const canSessions = canAccessNavHref('/sesiones', permissionCodes);

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
          hint: 'Proxy deuda · Reportes',
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
          Tenés el <span className="accent-text">control total</span> de tu
          gimnasio.
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

const PAGE_SIZE = 20;

/**
 * Dashboard para tenant 'admin' (plataforma).
 *
 * @remarks Lista los gyms y permite impersonar a un staff de cada uno. Al
 * impersonar se guarda la sesión del gym destino y se redirige a su subdominio
 * (`tenantOrigin`), porque el host actual es el de la plataforma.
 */
function AdminDashboard() {
  const [tenants, setTenants] = useState<PlatformTenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [modalTenant, setModalTenant] = useState<PlatformTenantSummary | null>(null);
  const [impersonateTenant, setImpersonateTenant] =
    useState<PlatformTenantSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await listPlatformTenants({ page, pageSize: PAGE_SIZE });
        if (cancelled) {
          return;
        }
        setTenants(data.items);
        setHasMore(data.hasMore);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page]);

  const total = tenants.length;

  return (
    <AdminShell title="Plataforma — Faciliter Brain">
      <div className="admin-dashboard">
        <ListToolbar>
          <h1>Gyms</h1>
          <p className="muted small">
            {listCountDescription(total, page, 'gym', 'gyms')}
          </p>
        </ListToolbar>
        {loading && <p>Cargando gyms...</p>}
        {error && <p className="error">{error}</p>}
        <DataTable
          title="Tenants"
          description={listCountDescription(total, page, 'gym', 'gyms')}
          loading={loading}
          error={error}
          isEmpty={tenants.length === 0}
          emptyText="No hay gyms registrados."
          header={
            <tr>
              <th>Nombre</th>
              <th>Slug</th>
              <th>Estado</th>
            <th>Miembros</th>
            <th>Acciones</th>
            </tr>
          }
          paginate={false}
        >
          {tenants.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td>
              <td>{t.slug}</td>
              <td>{t.status}</td>
              <td>{t.memberCount}</td>
              <td>
                <RowActions>
                  <RowIconButton
                    label="Ver detalles"
                    onClick={() => setModalTenant(t)}
                  >
                    <IconView />
                  </RowIconButton>
                  <RowIconButton
                    label="Entrar como gym"
                    onClick={() => setImpersonateTenant(t)}
                  >
                    <IconEdit />
                  </RowIconButton>
                </RowActions>
              </td>
            </tr>
          ))}
        </DataTable>
        {hasMore ? (
          <ListPagination
            page={page}
            hasMore={hasMore}
            onPageChange={setPage}
          />
        ) : null}
        {modalTenant ? (
          <AdminModal
            open={!!modalTenant}
            onClose={() => setModalTenant(null)}
            title={modalTenant.name}
            description={`${modalTenant.slug} · ${modalTenant.status}`}
          >
            <p>Miembros: {modalTenant.memberCount}</p>
          </AdminModal>
        ) : null}
        {impersonateTenant ? (
          <ImpersonateTenantPanel
            tenant={impersonateTenant}
            onClose={() => setImpersonateTenant(null)}
          />
        ) : null}
      </div>
    </AdminShell>
  );
}
  