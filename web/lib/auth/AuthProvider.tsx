'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { staffLogin, staffLogout } from '@/lib/api/auth';
import {
  clearStaffSession,
  getStaffSessionServerSnapshot,
  readStaffSession,
  subscribeStaffSession,
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
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Proveedor de sesión Staff para el panel web.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(
    subscribeStaffSession,
    readStaffSession,
    getStaffSessionServerSnapshot,
  );
  const ready = typeof window !== 'undefined';

  const login = useCallback(
    async (input: {
      tenantSlug?: string;
      tenantId?: string;
      email: string;
      password: string;
    }) => {
      const res = await staffLogin(input);
      writeStaffSession(res);
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

  const value = useMemo(
    () => ({ session, ready, login, logout }),
    [session, ready, login, logout],
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
