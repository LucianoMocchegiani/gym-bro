'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { fetchAuthMe, staffLogin, staffGoogleLogin } from '@/lib/api/auth';
import { getMyPermissions } from '@/lib/api/permissions';
import { signOutOfGym } from '@/lib/auth/gym-context';
import {
  getStaffSessionServerSnapshot,
  readStaffSession,
  subscribeStaffSession,
  updateStaffPermissions,
  writeStaffSession,
  updateStaffPlatformAccess,
  type StaffSession,
} from '@/lib/auth/session';

type AuthContextValue = {
  session: StaffSession | null;
  ready: boolean;
  /** `GET /auth/me` (o sin sesión) ya resolvió; si el token murió, `session` es null. */
  verified: boolean;
  login: (input: {
    tenantSlug?: string;
    tenantId?: string;
    email: string;
    password: string;
  }) => Promise<void>;
  loginWithGoogle: (input: { tenantId: string; idToken: string }) => Promise<void>;
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

  const [verified, setVerified] = useState(false);

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
      try {
        const me = await fetchAuthMe();
        updateStaffPlatformAccess(me.platformAccess);
      } catch {
        // Recorte de plan se hidrata en el efecto de sesión.
      }
    },
    [],
  );

  const loginWithGoogle = useCallback(
    async (input: { tenantId: string; idToken: string }) => {
      const res = await staffGoogleLogin(input);
      writeStaffSession(res, null);
      try {
        const perms = await getMyPermissions();
        updateStaffPermissions(perms.permissionCodes);
      } catch {
        // Nav queda sin filtrar hasta el próximo intento.
      }
      try {
        const me = await fetchAuthMe();
        updateStaffPlatformAccess(me.platformAccess);
      } catch {
        // Recorte de plan se hidrata en el efecto de sesión.
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await signOutOfGym();
  }, []);

  const refreshPermissions = useCallback(async () => {
    if (!readStaffSession()) {
      return;
    }
    const perms = await getMyPermissions();
    updateStaffPermissions(perms.permissionCodes);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!session) {
      setVerified(true);
      return;
    }
    let cancelled = false;
    setVerified(false);
    void (async () => {
      try {
        const me = await fetchAuthMe();
        if (!cancelled && me.platformAccess) {
          updateStaffPlatformAccess(me.platformAccess);
        }
      } catch {
        // 401: apiRequest ya limpió la sesión → RequireStaff va a /login.
      }
      if (!cancelled) {
        setVerified(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, session?.userId]);

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
    () => ({ session, ready, verified, login, loginWithGoogle, logout, refreshPermissions }),
    [session, ready, verified, login, loginWithGoogle, logout, refreshPermissions],
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
