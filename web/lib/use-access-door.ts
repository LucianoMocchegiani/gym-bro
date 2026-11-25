'use client';

import { useEffect, useState } from 'react';
import { getAccessDoor } from '@/lib/api/access';
import type { AccessProvider } from '@/lib/api/access';

/**
 * Sistema de puerta del gym; `null` mientras carga o si Club no está habilitado.
 *
 * @remarks Si falla la lectura se asume KUATIA (comportamiento previo).
 */
export function useAccessDoor(enabled = true): AccessProvider | null {
  const [provider, setProvider] = useState<AccessProvider | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!enabled) return () => { cancelled = true; };
    void (async () => {
      try {
        const door = await getAccessDoor();
        if (!cancelled) setProvider(door.provider);
      } catch {
        if (!cancelled) setProvider('KUATIA');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return enabled ? provider : null;
}
