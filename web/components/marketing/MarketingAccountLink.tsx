'use client';

import Link from 'next/link';
import { useIdentityAuth } from '@/lib/auth/IdentityAuthProvider';

function accountInitials(name: string | null, email: string): string {
  const src = name?.trim();
  if (!src) {
    return email.slice(0, 1).toUpperCase();
  }
  const parts = src.split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * Acceso a cuenta en el apex: avatar junto al tema (como el gym) o Entrar.
 */
export function MarketingAccountLink({
  variant,
}: {
  variant: 'header' | 'footer';
}) {
  const { session, ready } = useIdentityAuth();

  if (variant === 'footer') {
    if (!ready) {
      return <Link href="/cuenta">Acceder</Link>;
    }
    if (session) {
      return <Link href="/cuenta">Mi cuenta</Link>;
    }
    return <Link href="/login">Acceder</Link>;
  }

  if (!ready) {
    return (
      <Link
        href="/cuenta"
        className="account-avatar-btn"
        aria-label="Cuenta"
        aria-busy="true"
      >
        …
      </Link>
    );
  }

  if (session) {
    return (
      <Link
        href="/cuenta"
        className="account-avatar-btn"
        title={session.email}
        aria-label="Mi cuenta"
      >
        {accountInitials(session.name, session.email)}
      </Link>
    );
  }

  return (
    <Link href="/login" className="mkt-header-login">
      Entrar
    </Link>
  );
}
