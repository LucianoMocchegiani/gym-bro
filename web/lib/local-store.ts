/**
 * Valor JSON persistido en localStorage (uno por origen), listo para
 * `useSyncExternalStore`.
 */
export type LocalStore<T> = {
  subscribe: (onStoreChange: () => void) => () => void;
  /** Referencia estable mientras el valor en localStorage no cambie. */
  read: () => T | null;
  /** Snapshot SSR: sin valor. */
  serverSnapshot: () => null;
  write: (value: T) => T;
  clear: () => void;
};

/**
 * @param parse - Valida el JSON leído; `null` lo trata como ausente.
 */
export function createLocalStore<T>(options: {
  storageKey: string;
  eventName: string;
  parse: (raw: unknown) => T | null;
}): LocalStore<T> {
  const { storageKey, eventName, parse } = options;
  let cachedRaw: string | null | undefined;
  let cachedValue: T | null = null;

  function decode(raw: string): T | null {
    try {
      return parse(JSON.parse(raw));
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
      return cachedValue;
    }
    cachedRaw = raw;
    cachedValue = raw ? decode(raw) : null;
    return cachedValue;
  }

  function persist(value: T | null): void {
    if (value !== null) {
      const raw = JSON.stringify(value);
      window.localStorage.setItem(storageKey, raw);
      cachedRaw = raw;
      cachedValue = value;
    } else {
      window.localStorage.removeItem(storageKey);
      cachedRaw = null;
      cachedValue = null;
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
    write(value) {
      persist(value);
      return value;
    },
    clear() {
      if (typeof window === 'undefined') {
        return;
      }
      persist(null);
    },
  };
}
