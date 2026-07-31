'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { superLogin, superLogout } from '@/lib/api/auth';
import {
  clearSuperSession,
  getSuperSessionServerSnapshot,
  readSuperSession,
  subscribeSuperSession,
  writeSuperSession,
  type SuperSession,
} from '@/lib/auth/super-session';

type SuperAuthContextValue = {
  session: SuperSession | null;
  ready: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const SuperAuthContext = createContext<SuperAuthContextValue | null>(null);

/**
 * Proveedor de sesión Super Admin.
 */
export function SuperAuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(
    subscribeSuperSession,
    readSuperSession,
    getSuperSessionServerSnapshot,
  );
  const ready = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const res = await superLogin(input);
      writeSuperSession(res);
    },
    [],
  );

  const logout = useCallback(async () => {
    const current = readSuperSession();
    if (current?.refreshToken) {
      await superLogout(current.refreshToken);
    }
    clearSuperSession();
  }, []);

  const value = useMemo(
    () => ({ session, ready, login, logout }),
    [session, ready, login, logout],
  );

  return (
    <SuperAuthContext.Provider value={value}>
      {children}
    </SuperAuthContext.Provider>
  );
}

/**
 * Hook de sesión Super.
 */
export function useSuperAuth(): SuperAuthContextValue {
  const ctx = useContext(SuperAuthContext);
  if (!ctx) {
    throw new Error('useSuperAuth must be used within SuperAuthProvider');
  }
  return ctx;
}
