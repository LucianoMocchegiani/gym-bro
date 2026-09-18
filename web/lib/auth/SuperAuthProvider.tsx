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
import { fetchAuthMe, superLogin, superLogout } from '@/lib/api/auth';
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
  verified: boolean;
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
  const [verified, setVerified] = useState(false);

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
        await fetchAuthMe('super');
      } catch {
        // 401: apiRequest ya limpió la sesión → RequireSuper va a /super/login.
      }
      if (!cancelled) {
        setVerified(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, session?.userId]);

  const value = useMemo(
    () => ({ session, ready, verified, login, logout }),
    [session, ready, verified, login, logout],
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
