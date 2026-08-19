'use client';

import { AccountPanel } from '@/components/AccountPanel';
import { RequireSuper } from '@/components/RequireSuper';
import { SuperShell } from '@/components/SuperShell';
import { useSuperAuth } from '@/lib/auth/SuperAuthProvider';

/**
 * Pantalla de cuenta del Super Admin (avatar en topbar).
 */
export default function SuperCuentaPage() {
  return (
    <RequireSuper>
      <SuperCuentaInner />
    </RequireSuper>
  );
}

function SuperCuentaInner() {
  const { session, logout } = useSuperAuth();

  return (
    <SuperShell title="Mi cuenta">
      <AccountPanel
        name={session?.name ?? null}
        email={session?.email ?? ''}
        subtitle="Super Admin"
        badge="Plataforma"
        authMode="super"
        onLogout={logout}
        loginHref="/super/login"
      />
    </SuperShell>
  );
}
