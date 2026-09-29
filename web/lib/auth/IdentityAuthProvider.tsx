'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { identityLogin, identityRegister, staffLogout } from '@/lib/api/auth';
import {
  clearIdentitySession,
  getIdentitySessionServerSnapshot,
  readIdentitySession,
  subscribeIdentitySession,
  writeIdentitySession,
  type IdentitySession,
} from '@/lib/auth/identity-session';

type IdentityAuthValue = {
  session: IdentitySession | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    name?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const IdentityAuthContext = createContext<IdentityAuthValue | null>(null);

function subscribeAlways(): () => void {
  return () => undefined;
}

/**
 * Sesión Identity en el apex (contratar / ver gyms). Independiente del staff.
 */
export function IdentityAuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(
    subscribeIdentitySession,
    readIdentitySession,
    getIdentitySessionServerSnapshot,
  );
  const ready = useSyncExternalStore(
    subscribeAlways,
    () => true,
    () => false,
  );

  const login = useCallback(async (email: string, password: string) => {
    const res = await identityLogin({ email, password });
    writeIdentitySession(res);
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; name?: string }) => {
      const res = await identityRegister(input);
      writeIdentitySession(res);
    },
    [],
  );

  const logout = useCallback(async () => {
    const current = readIdentitySession();
    if (current?.refreshToken) {
      await staffLogout(current.refreshToken);
    }
    clearIdentitySession();
  }, []);

  const value = useMemo(
    () => ({ session, ready, login, register, logout }),
    [session, ready, login, register, logout],
  );

  return (
    <IdentityAuthContext.Provider value={value}>
      {children}
    </IdentityAuthContext.Provider>
  );
}

export function useIdentityAuth(): IdentityAuthValue {
  const ctx = useContext(IdentityAuthContext);
  if (!ctx) {
    throw new Error('useIdentityAuth requires IdentityAuthProvider');
  }
  return ctx;
}
