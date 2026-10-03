'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useMemberSession } from '@/lib/auth/useMemberSession';

/**
 * Acceso en el header de la web del gym: portal del socio, panel o Entrar.
 */
export function GymAccountLink({ slug }: { slug: string }) {
  const { session: staff, ready } = useAuth();
  const { session: member } = useMemberSession(slug);

  if (ready && member) {
    return (
      <Link href="/cuenta" className="mkt-header-login">
        Mi cuenta
      </Link>
    );
  }
  if (ready && staff) {
    return (
      <Link href="/dashboard" className="mkt-header-login">
        Panel
      </Link>
    );
  }
  return (
    <Link href="/login" className="mkt-header-login">
      Entrar
    </Link>
  );
}
