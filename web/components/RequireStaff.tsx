'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';

/**
 * Redirige a `/login` si no hay sesión Staff válida (`GET /auth/me`).
 */
export function RequireStaff({ children }: { children: React.ReactNode }) {
  const { session, ready, verified } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && verified && !session) {
      router.replace('/login');
    }
  }, [ready, verified, session, router]);

  if (!ready || !verified) {
    return <p className="muted">Cargando sesión…</p>;
  }
  if (!session) {
    return null;
  }
  return <>{children}</>;
}
