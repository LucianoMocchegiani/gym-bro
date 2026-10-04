'use client';

import Link from 'next/link';
import { AccountAvatarLink } from '@/components/AccountAvatarLink';
import { useIdentityAuth } from '@/lib/auth/IdentityAuthProvider';

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

  if (!ready || session) {
    return (
      <AccountAvatarLink
        href="/cuenta"
        name={session?.name}
        email={session?.email}
      />
    );
  }

  return (
    <Link href="/login" className="mkt-header-login">
      Entrar
    </Link>
  );
}
