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
  const { storageKey, eventName, normalize } = options;
  let cachedRaw: string | null | undefined;
  let cachedSession: T | null = null;

  function parse(raw: string): T | null {
    try {
      const parsed = JSON.parse(raw) as T;
      if (!parsed.accessToken) {
        return null;
      }
      return normalize ? normalize(parsed) : parsed;
    } catch {
      return null;
    }
  }

  function read(): T | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const raw = window.localStorage.getItem(storageKey);
    if (raw === cachedRaw) {
      return cachedSession;
    }
    cachedRaw = raw;
    cachedSession = raw ? parse(raw) : null;
    return cachedSession;
  }

  function persist(session: T | null): void {
    if (session) {
      const raw = JSON.stringify(session);
      window.localStorage.setItem(storageKey, raw);
      cachedRaw = raw;
      cachedSession = session;
    } else {
      window.localStorage.removeItem(storageKey);
      cachedRaw = null;
      cachedSession = null;
    }
    window.dispatchEvent(new Event(eventName));
  }

  return {
    subscribe(onStoreChange) {
      if (typeof window === 'undefined') {
        return () => undefined;
      }
      window.addEventListener(eventName, onStoreChange);
      window.addEventListener('storage', onStoreChange);
      return () => {
        window.removeEventListener(eventName, onStoreChange);
        window.removeEventListener('storage', onStoreChange);
      };
    },
    read,
    serverSnapshot: () => null,
    write(session) {
      persist(session);
      return session;
    },
    update(patch) {
      const current = read();
      if (!current) {
        return null;
      }
      const next = { ...current, ...patch };
      persist(next);
      return next;
    },
    clear() {
      if (typeof window === 'undefined') {
        return;
      }
      persist(null);
    },
  };
}
