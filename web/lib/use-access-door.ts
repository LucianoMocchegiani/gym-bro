'use client';

import { useEffect, useState } from 'react';
import { getAccessDoor } from '@/lib/api/access';
import type { AccessProvider } from '@/lib/api/access';

/**
 * Sistema de puerta del gym; `null` mientras carga.
 *
 * @remarks Si falla la lectura se asume KUATIA (comportamiento previo).
 */
export function useAccessDoor(): AccessProvider | null {
  const [provider, setProvider] = useState<AccessProvider | null>(null);

  useEffect(() => {
    let cancelled = false;
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
  }, []);

  return provider;
}
