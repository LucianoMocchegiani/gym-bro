'use client';

import Link from 'next/link';
import { AccountAvatarLink } from '@/components/AccountAvatarLink';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useGymAccountPerson } from '@/lib/auth/useGymAccountPerson';

/**
 * Derecha del header de la web del gym, con la misma disposición que el
 * topbar del panel: acceso (portal o panel), tema y avatar de la cuenta
 * (`/cuenta`). Sin sesión: tema + Entrar.
 */
export function GymHeaderActions({ slug }: { slug: string }) {
  const { ready, member, staff, person } = useGymAccountPerson(slug);

  return (
    <div className="mkt-header-actions">
      {ready && member ? (
        <Link href="/portal" className="mkt-header-login">
          Mi portal
        </Link>
      ) : ready && staff ? (
        <Link href="/dashboard" className="mkt-header-login">
          Panel
        </Link>
      ) : null}
      <ThemeToggle />
      {ready && !person ? (
        <Link href="/login" className="mkt-header-login">
          Entrar
        </Link>
      ) : (
        <AccountAvatarLink
          href="/cuenta"
          name={person?.name}
          email={person?.email}
        />
      )}
    </div>
  );
}
