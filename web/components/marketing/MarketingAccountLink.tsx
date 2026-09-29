'use client';

import Link from 'next/link';
import { useIdentityAuth } from '@/lib/auth/IdentityAuthProvider';

/**
 * Entrar vs Mi cuenta en el apex, según sesión Identity (como el gym: login o cuenta).
 */
export function MarketingAccountLink({
  variant,
}: {
  variant: 'nav' | 'footer';
}) {
  const { session, ready } = useIdentityAuth();
  if (!ready) {
    return (
      <Link href="/cuenta">
        {variant === 'nav' ? 'Entrar' : 'Acceder'}
      </Link>
    );
  }
  if (session) {
    return <Link href="/cuenta">Mi cuenta</Link>;
  }
  return (
    <Link href="/login">{variant === 'nav' ? 'Entrar' : 'Acceder'}</Link>
  );
}
