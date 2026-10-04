'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AccountPanel } from '@/components/AccountPanel';
import { Panel } from '@/components/AdminUi';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useIdentityAuth } from '@/lib/auth/IdentityAuthProvider';
import { signOutOfGym } from '@/lib/auth/gym-context';
import { useMemberSession } from '@/lib/auth/useMemberSession';

/**
 * `{slug}/cuenta`: cuenta Faciliter de quien entró al gym (datos, contraseña y
 * cerrar sesión), con accesos al portal del socio y al panel.
 *
 * @remarks Usa la sesión de la cuenta Faciliter y, si no está, la del socio.
 * Solo staff (p. ej. impersonación) va a `/dashboard/cuenta`; sin sesión, a
 * `/login`. Cerrar sesión cierra las tres sesiones del gym y vacía el carrito.
 */
export function GymAccountPage({ slug }: { slug: string }) {
  const router = useRouter();
  const { session: identity, ready: identityReady } = useIdentityAuth();
  const { session: member, ready: memberReady } = useMemberSession(slug);
  const { session: staff, ready: staffReady } = useAuth();
  const ready = identityReady && memberReady && staffReady;
  const person = identity ?? member;
  const leavingRef = useRef(false);

  useEffect(() => {
    if (!ready || person || leavingRef.current) {
      return;
    }
    router.replace(staff ? '/dashboard/cuenta' : '/login?next=/cuenta');
  }, [ready, person, staff, router]);

  async function handleLogout(): Promise<void> {
    leavingRef.current = true;
    await signOutOfGym();
  }

  if (!ready || !person) {
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
                  Ir al panel del gym
                </Link>
              ) : null}
            </div>
          </Panel>
        ) : null}
        <AccountPanel
          name={person.name}
          email={person.email}
          subtitle="Cuenta Faciliter"
          onLogout={handleLogout}
          loginHref="/"
          hasPassword={identity?.hasPassword ?? true}
          passwordAuth={identity ? 'identity' : 'member'}
        />
      </div>
    </section>
  );
}
