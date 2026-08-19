'use client';

import { AccountPanel } from '@/components/AccountPanel';
import { AdminShell } from '@/components/AdminShell';
import { RequireStaff } from '@/components/RequireStaff';
import { useAuth } from '@/lib/auth/AuthProvider';

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

  return (
    <AdminShell title="Mi cuenta">
      <AccountPanel
        name={session?.name ?? null}
        email={session?.email ?? ''}
        subtitle="Operador"
        badge={session?.tenantSlug ? `Gym: ${session.tenantSlug}` : null}
        authMode="staff"
        onLogout={logout}
        loginHref="/login"
      />
    </AdminShell>
  );
}
