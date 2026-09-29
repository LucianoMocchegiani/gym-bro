'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
 * Apex /cuenta: lista de gyms del dueño + plan de solo lectura.
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
              : 'No se pudieron cargar los gyms',
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
            err instanceof ApiClientError ? err.message : 'No se pudo cargar el plan',
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
        <p className="muted">Cargando…</p>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <section className="mkt-inner mkt-section">
        <h1 className="mkt-h2">Tus gyms</h1>
        <p className="muted">
          {session.email}{' '}
          <button type="button" className="linkish" onClick={() => void logout()}>
            Salir
          </button>
        </p>
        {error ? <p className="error">{error}</p> : null}
        <p>
          <Link className="btn primary" href="/empezar">
            + Nuevo gym
          </Link>
        </p>
        {gyms && gyms.length === 0 ? (
          <p className="muted">Todavía no tenés un gym. Contratá un plan.</p>
        ) : null}
        {gyms && gyms.length > 0 ? (
          <ul className="plain-list">
            {gyms.map((gym) => (
              <li key={gym.tenantId}>
                <label>
                  <input
                    type="radio"
                    name="gym"
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
        {plan ? <PlanPanel plan={plan} /> : null}
      </section>
    </MarketingShell>
  );
}
