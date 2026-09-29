'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AccountPanel } from '@/components/AccountPanel';
import { Panel } from '@/components/AdminUi';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { PlanPanel } from '@/components/PlanPanel';
import { ApiClientError } from '@/lib/api/client';
import {
  getIdentityGymPlan,
  listIdentityGyms,
  type IdentityGymRow,
} from '@/lib/api/identity-platform';
import type { GymPlanView } from '@/lib/api/plan';
import { useIdentityAuth } from '@/lib/auth/IdentityAuthProvider';
import { tenantOrigin } from '@/lib/tenant-host';

/**
 * Apex `/cuenta`: misma ficha que el gym (`AccountPanel`) + tenants y plan.
 *
 * @remarks Sin sesión redirige a `/login` (mismo patrón que el staff).
 */
export function IdentityAccountPage() {
  const { session, ready, logout } = useIdentityAuth();
  const router = useRouter();
  const [gyms, setGyms] = useState<IdentityGymRow[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [plan, setPlan] = useState<GymPlanView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!session) {
      router.replace('/login?next=/cuenta');
    }
  }, [ready, session, router]);

  useEffect(() => {
    if (!session) {
      return;
    }
    let cancelled = false;
    void listIdentityGyms()
      .then((rows) => {
        if (cancelled) {
          return;
        }
        setGyms(rows);
        setSelected((current) => current ?? rows[0]?.tenantId ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'No se pudieron cargar los tenants',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!selected) {
      setPlan(null);
      return;
    }
    let cancelled = false;
    void getIdentityGymPlan(selected)
      .then((data) => {
        if (!cancelled) {
          setPlan(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'No se pudo cargar el plan',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  if (!ready || !session) {
    return (
      <MarketingShell>
        <section className="mkt-inner mkt-section">
          <p className="muted">Cargando sesión…</p>
        </section>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <section className="mkt-inner mkt-section">
        <h1 className="mkt-h2">Mi cuenta</h1>
        {error ? <p className="error">{error}</p> : null}
        <div className="admin-stack">
          <AccountPanel
            name={session.name}
            email={session.email}
            subtitle="Cuenta Faciliter"
            onLogout={logout}
            loginHref="/login"
            hasPassword={session.hasPassword}
            passwordAuth="identity"
          />
          <Panel
            title="Mis tenants"
            description="Gyms, clubes o estudios de esta cuenta."
          >
            <p>
              <Link className="btn" href="/empezar">
                + Nuevo tenant
              </Link>
            </p>
            {gyms === null ? (
              <p className="muted">Cargando tenants…</p>
            ) : null}
            {gyms && gyms.length === 0 ? (
              <p className="muted">
                Todavía no tenés un tenant. Contratá un plan.
              </p>
            ) : null}
            {gyms && gyms.length > 0 ? (
              <ul className="plain-list">
                {gyms.map((gym) => (
                  <li key={gym.tenantId}>
                    <label>
                      <input
                        type="radio"
                        name="tenant"
                        checked={selected === gym.tenantId}
                        onChange={() => setSelected(gym.tenantId)}
                      />{' '}
                      {gym.name} ({gym.slug}){' '}
                      <a href={tenantOrigin(gym.slug)}>Abrir panel</a>
                    </label>
                  </li>
                ))}
              </ul>
            ) : null}
          </Panel>
          {plan ? <PlanPanel plan={plan} /> : null}
        </div>
      </section>
    </MarketingShell>
  );
}
