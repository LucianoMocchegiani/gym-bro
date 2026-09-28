'use client';

import { AccountPanel } from '@/components/AccountPanel';
import { AdminShell } from '@/components/AdminShell';
import { RequireStaff } from '@/components/RequireStaff';
import { useAuth } from '@/lib/auth/AuthProvider';
import { tenantOrigin } from '@/lib/tenant-host';

/**
 * Pantalla de cuenta del staff (avatar en topbar).
 */
export default function CuentaPage() {
  return (
    <RequireStaff>
      <CuentaInner />
    </RequireStaff>
  );
}

function CuentaInner() {
  const { session, logout } = useAuth();

  // Impersonación: el logout del gym no restaura Super; la sesión de
  // plataforma sigue en el origen `admin`.
  const isImpersonating = session?.impersonating === true;

  return (
    <AdminShell title="Mi cuenta">
      <AccountPanel
        name={session?.name ?? null}
        email={session?.email ?? ''}
        subtitle={isImpersonating ? 'Impersonando (plataforma)' : 'Operador'}
        badge={session?.tenantSlug ? `Gym: ${session.tenantSlug}` : null}
        onLogout={logout}
        loginHref="/login"
        onReturnToPlatform={
          isImpersonating
            ? () => {
                void logout().then(() => {
                  window.location.replace(tenantOrigin('admin'));
                });
              }
            : undefined
        }
        hasPassword={session?.hasPassword ?? true}
      />
    </AdminShell>
  );
}
