'use client';

import { AccountPanel } from '@/components/AccountPanel';
import { AdminShell } from '@/components/AdminShell';
import { RequireStaff } from '@/components/RequireStaff';
import { useAuth } from '@/lib/auth/AuthProvider';
import { tenantOrigin } from '@/lib/tenant-host';

/**
 * Mi cuenta del staff en el gym.
 */
export function StaffCuentaPage() {
  return (
    <RequireStaff>
      <StaffCuentaInner />
    </RequireStaff>
  );
}

function StaffCuentaInner() {
  const { session, logout } = useAuth();
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
                  window.location.replace(`${tenantOrigin('admin')}/dashboard`);
                });
              }
            : undefined
        }
        hasPassword={session?.hasPassword ?? true}
      />
    </AdminShell>
  );
}
