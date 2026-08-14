'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { staffLogin, staffLogout } from '@/lib/api/auth';
import { getMyPermissions } from '@/lib/api/permissions';
import {
  clearStaffSession,
  getStaffSessionServerSnapshot,
  readStaffSession,
  subscribeStaffSession,
  updateStaffPermissions,
  writeStaffSession,
  type StaffSession,
} from '@/lib/auth/session';

type AuthContextValue = {
  session: StaffSession | null;
  ready: boolean;
  login: (input: {
    tenantSlug?: string;
    tenantId?: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  /** Recarga permisos desde API (p. ej. tras cambiar roles). */
  refreshPermissions: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function subscribeAlways(): () => void {
  return () => undefined;
}

/**
 * Proveedor de sesión Staff para el panel web.
 *
 * @remarks `ready` usa `useSyncExternalStore` para que SSR e hidratación
 * coincidan (evitar “Cargando sesión…” huérfano en el DOM).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(
    subscribeStaffSession,
    readStaffSession,
    getStaffSessionServerSnapshot,
  );
  const ready = useSyncExternalStore(
    subscribeAlways,
    () => true,
    () => false,
  );

  const login = useCallback(
    async (input: {
      tenantSlug?: string;
      tenantId?: string;
      email: string;
      password: string;
    }) => {
      const res = await staffLogin(input);
      writeStaffSession(res, input.tenantSlug ?? null);
      try {
        const perms = await getMyPermissions();
        updateStaffPermissions(perms.permissionCodes);
      } catch {
        // Nav queda sin filtrar hasta el próximo intento.
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    const current = readStaffSession();
    if (current?.refreshToken) {
      await staffLogout(current.refreshToken);
    }
    clearStaffSession();
  }, []);

  const refreshPermissions = useCallback(async () => {
    if (!readStaffSession()) {
      return;
    }
    const perms = await getMyPermissions();
    updateStaffPermissions(perms.permissionCodes);
  }, []);

  useEffect(() => {
    if (!session || session.permissionCodes != null) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const perms = await getMyPermissions();
        if (!cancelled) {
          updateStaffPermissions(perms.permissionCodes);
        }
      } catch {
        // Mantener nav completa si falla (API sigue autorizando).
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const value = useMemo(
    () => ({ session, ready, login, logout, refreshPermissions }),
    [session, ready, login, logout, refreshPermissions],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

/**
 * Hook de sesión Staff.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
