'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';

/**
 * Redirige a `/login` si no hay sesión Staff.
 */
export function RequireStaff({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !session) {
      router.replace('/login');
    }
  }, [ready, session, router]);

  if (!ready) {
    return <p className="muted">Cargando sesión…</p>;
  }
  if (!session) {
    return null;
  }
  return <>{children}</>;
}
