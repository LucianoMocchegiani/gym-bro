'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { staffLogin, staffLogout } from '@/lib/api/auth';
import {
  clearStaffSession,
  readStaffSession,
  writeStaffSession,
  type StaffSession,
} from '@/lib/auth/session';

type AuthContextValue = {
  session: StaffSession | null;
  ready: boolean;
  login: (input: {
    tenantId: string;
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
  const [session, setSession] = useState<StaffSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(readStaffSession());
    setReady(true);
  }, []);

  const login = useCallback(
    async (input: {
      tenantId: string;
      email: string;
      password: string;
    }) => {
      const res = await staffLogin(input);
      const next = writeStaffSession(res);
      setSession(next);
    },
    [],
  );

  const logout = useCallback(async () => {
    const current = readStaffSession();
    if (current?.refreshToken) {
      await staffLogout(current.refreshToken);
    }
    clearStaffSession();
    setSession(null);
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
