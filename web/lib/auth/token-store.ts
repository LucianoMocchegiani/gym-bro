import { createLocalStore } from '@/lib/local-store';

/**
 * Sesión con tokens persistida en localStorage (una por origen), lista para
 * `useSyncExternalStore`.
 */
export type TokenSession = {
  accessToken: string;
  refreshToken: string;
};

export type TokenStore<T extends TokenSession> = {
  subscribe: (onStoreChange: () => void) => () => void;
  /** Referencia estable mientras el valor en localStorage no cambie. */
  read: () => T | null;
  /** Snapshot SSR: sin sesión. */
  serverSnapshot: () => null;
  write: (session: T) => T;
  /** Ajusta campos de la sesión actual (no-op sin sesión). */
  update: (patch: Partial<T>) => T | null;
  clear: () => void;
};

export function createTokenStore<T extends TokenSession>(options: {
  storageKey: string;
  eventName: string;
  normalize?: (parsed: T) => T;
}): TokenStore<T> {
  const { normalize } = options;
  const store = createLocalStore<T>({
    storageKey: options.storageKey,
    eventName: options.eventName,
    parse(raw) {
      const parsed = raw as T | null;
      if (!parsed?.accessToken) {
        return null;
      }
      return normalize ? normalize(parsed) : parsed;
    },
  });

  return {
    ...store,
    update(patch) {
      const current = store.read();
      if (!current) {
        return null;
      }
      return store.write({ ...current, ...patch });
    },
  };
}
