'use client';

import { AccountPanel } from '@/components/AccountPanel';
import { AdminShell } from '@/components/AdminShell';
import { RequireStaff } from '@/components/RequireStaff';
import { useAuth } from '@/lib/auth/AuthProvider';
import { readSuperSession } from '@/lib/auth/super-session';

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

  // Si la sesión es por impersonación y hay sesión de Super, volver a Super
  const isImpersonating = session?.impersonating === true;
  const hasSuperSession = readSuperSession() !== null;
  const loginHref = isImpersonating && hasSuperSession
    ? '/super/tenants'
    : '/login';

  return (
    <AdminShell title="Mi cuenta">
      <AccountPanel
        name={session?.name ?? null}
        email={session?.email ?? ''}
        subtitle={isImpersonating ? 'Impersonando (Super Admin)' : 'Operador'}
        badge={session?.tenantSlug ? `Gym: ${session.tenantSlug}` : null}
        authMode="staff"
        onLogout={logout}
        loginHref={loginHref}
      />
    </AdminShell>
  );
}
