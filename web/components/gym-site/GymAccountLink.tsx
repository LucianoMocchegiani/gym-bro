'use client';

import Link from 'next/link';
import { AccountAvatarLink } from '@/components/AccountAvatarLink';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useIdentityAuth } from '@/lib/auth/IdentityAuthProvider';
import { useMemberSession } from '@/lib/auth/useMemberSession';

/**
 * Header de la web del gym: acceso al portal (socio) o al panel (staff) y el
 * avatar de la cuenta (`/cuenta`), como en el apex. Sin sesión: Entrar.
 */
export function GymAccountLink({ slug }: { slug: string }) {
  const { session: staff, ready } = useAuth();
  const { session: identity } = useIdentityAuth();
  const { session: member } = useMemberSession(slug);

  if (!ready) {
    return <AccountAvatarLink href="/cuenta" />;
  }
  const person = identity ?? member ?? staff;
  if (!person) {
    return (
      <Link href="/login" className="mkt-header-login">
        Entrar
      </Link>
    );
  }
  return (
    <>
      {member ? (
        <Link href="/portal" className="mkt-header-login">
          Mi portal
        </Link>
      ) : staff ? (
        <Link href="/dashboard" className="mkt-header-login">
          Panel
        </Link>
      ) : null}
      <AccountAvatarLink
        href={identity || member ? '/cuenta' : '/dashboard/cuenta'}
        name={person.name}
        email={person.email}
      />
    </>
  );
}
