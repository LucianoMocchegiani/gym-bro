'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SuperAuthProvider, useSuperAuth } from '@/lib/auth/SuperAuthProvider';

/**
 * Exige sesión Super válida (`GET /auth/me`); envuelve con provider.
 */
export function RequireSuper({ children }: { children: React.ReactNode }) {
  return (
    <SuperAuthProvider>
      <RequireSuperInner>{children}</RequireSuperInner>
    </SuperAuthProvider>
  );
}

function RequireSuperInner({ children }: { children: React.ReactNode }) {
  const { session, ready, verified } = useSuperAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && verified && !session) {
      router.replace('/super/login');
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
