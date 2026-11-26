'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AccountPanel } from '@/components/AccountPanel';
import { Panel } from '@/components/AdminUi';
import { signOutOfGym } from '@/lib/auth/gym-context';
import { useGymAccountPerson } from '@/lib/auth/useGymAccountPerson';
import { PLATFORM_TENANT_SLUG, tenantOrigin } from '@/lib/tenant-host';

/**
 * `{slug}/cuenta`: única pantalla de cuenta del gym (socio y staff): datos,
 * contraseña, cerrar sesión y accesos al portal del socio y al panel.
 *
 * @remarks En una impersonación se ofrece volver a plataforma. Sin sesión,
 * `/login`. Cerrar sesión cierra las tres sesiones del gym y vacía el carrito.
 */
export function GymAccountPage({ slug }: { slug: string }) {
  const router = useRouter();
  const { ready, identity, member, staff, impersonating, person, sessionKind } =
    useGymAccountPerson(slug);
  const leavingRef = useRef(false);

  useEffect(() => {
    if (!ready || person || leavingRef.current) {
      return;
    }
    router.replace('/login?next=/cuenta');
  }, [ready, person, router]);

  async function handleLogout(): Promise<void> {
    leavingRef.current = true;
    await signOutOfGym();
  }

  if (!ready || !person || !sessionKind) {
    return <p className="muted mkt-inner mkt-section">Cargando tu cuenta…</p>;
  }

  return (
    <section className="mkt-inner mkt-section">
      <h1 className="mkt-h2">Mi cuenta</h1>
      <div className="admin-stack">
        {member || staff ? (
          <Panel title="Accesos" description="Lo que podés hacer en este gym.">
            <div className="admin-modal-actions">
              {member ? (
                <Link className="btn" href="/portal">
                  Ir a mi portal de socio
                </Link>
              ) : null}
              {staff ? (
                <Link className="btn ghost" href="/dashboard">
                  Ir al panel
                </Link>
              ) : null}
            </div>
          </Panel>
        ) : null}
        <AccountPanel
          name={person.name}
          email={person.email}
          subtitle={
            impersonating ? 'Impersonando (plataforma)' : 'Cuenta Faciliter'
          }
          onLogout={handleLogout}
          loginHref="/"
          onReturnToPlatform={
            impersonating
              ? () => {
                  leavingRef.current = true;
                  void signOutOfGym().then(() => {
                    window.location.replace(
                      `${tenantOrigin(PLATFORM_TENANT_SLUG)}/dashboard`,
                    );
                  });
                }
              : undefined
          }
          hasPassword={
            sessionKind === 'identity'
              ? identity?.hasPassword
              : sessionKind === 'staff'
                ? staff?.hasPassword
                : true
          }
          passwordAuth={sessionKind}
        />
      </div>
    </section>
  );
}
