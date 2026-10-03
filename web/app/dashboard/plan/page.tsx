'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { PlanPanel } from '@/components/PlanPanel';
import { RequireStaff } from '@/components/RequireStaff';
import { SkeletonPanel } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import { getGymPlan } from '@/lib/api/plan';
import type { GymPlanView } from '@/lib/api/plan';
import { extractTenantSlugFromHost } from '@/lib/tenant-host';

function subscribeHost(): () => void {
  return () => undefined;
}

function readHostSlug(): string | null {
  return extractTenantSlugFromHost(window.location.host);
}

function getServerHostSlug(): null {
  return null;
}

/**
 * Sistema → Plan / Uso: contrato Faciliter de este gym.
 */
export default function PlanPage() {
  return (
    <RequireStaff>
      <PlanInner />
    </RequireStaff>
  );
}

function PlanInner() {
  const hostSlug = useSyncExternalStore(
    subscribeHost,
    readHostSlug,
    getServerHostSlug,
  );
  const isAdminHost = hostSlug === 'admin';
  const [plan, setPlan] = useState<GymPlanView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hostSlug === null || isAdminHost) {
      return;
    }
    let cancelled = false;
    void getGymPlan()
      .then((data) => {
        if (!cancelled) {
          setPlan(data);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar el plan',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [hostSlug, isAdminHost]);

  if (hostSlug === null) {
    return (
      <AdminShell title="Plan / Uso">
        <SkeletonPanel lines={6} />
      </AdminShell>
    );
  }

  if (isAdminHost) {
    return (
      <AdminShell title="Plan / Uso">
        <p className="muted">
          La plataforma no tiene un plan Faciliter. Los gyms se ven en Tenants
          y se cobran en Caja.
        </p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Plan / Uso" subtitle="Contrato con Faciliter">
      {error ? <p className="error">{error}</p> : null}
      {!error && !plan ? <SkeletonPanel lines={6} /> : null}
      {plan ? <PlanPanel plan={plan} /> : null}
    </AdminShell>
  );
}
