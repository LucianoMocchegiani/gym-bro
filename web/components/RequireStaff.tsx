'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { clearStaffSession } from '@/lib/auth/session';
import { extractTenantSlugFromHost, tenantOrigin } from '@/lib/tenant-host';

/**
 * Guarda de sesión Staff: valida contra la API y **reconcilia con el host**.
 *
 * @remarks La sesión vive en `localStorage`, que es por origen. Como cada tenant
 * tiene su subdominio, el host es la verdad: si la sesión guardada es de otro
 * gym no sirve en este host, así que se descarta y se manda a `/login` (o al
 * subdominio que corresponde si el usuario venía de una impersonación).
 *
 * Sin esto, entrar a `admin.localhost` con un token de `gym-de-prueba` en el
 * mismo navegador mostraría datos cruzados: el host queda decorativo y manda
 * el token.
 */
export function RequireStaff({ children }: { children: React.ReactNode }) {
  const { session, ready, verified } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!(ready && verified)) {
      return;
    }
    if (!session) {
      router.replace('/login');
      return;
    }

    // El host no tiene slug (apex) → no se puede reconciliar nada.
    const hostSlug = extractTenantSlugFromHost(window.location.host);
    if (!hostSlug) {
      return;
    }
    if (session.tenantSlug && session.tenantSlug !== hostSlug) {
      // Sesión de otro tenant en este host: no aplica. Se limpia para que no
      // se repita en cada navegación.
      clearStaffSession();
      router.replace(
        session.impersonating
          ? `${tenantOrigin(hostSlug)}/login`
          : '/login',
      );
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
