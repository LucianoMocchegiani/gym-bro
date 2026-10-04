'use client';

import { useEffect, useMemo, useState } from 'react';
import { ApiClientError } from '@/lib/api/client';
import {
  listMyNotifications,
  markMyNotificationRead,
  type MemberNotification,
} from '@/lib/api/member-portal';

export type MemberNotices = {
  /** null mientras carga. */
  items: MemberNotification[] | null;
  error: string | null;
  unread: number;
  reload: () => void;
  /** Marca leído (si no lo estaba); el contador baja al instante. */
  markRead: (id: string) => Promise<void>;
};

/**
 * Bandeja de avisos del socio (CU-NOT-005). Se carga una vez en el portal y la
 * comparten el menú, el inicio y la página de avisos (como el badge de la app).
 */
export function useMemberNotices(enabled: boolean): MemberNotices {
  const [items, setItems] = useState<MemberNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listMyNotifications();
        if (!cancelled) {
          setItems(rows);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'No se pudieron cargar los avisos',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, reloadKey]);

  return useMemo(
    () => ({
      items,
      error,
      unread: items?.filter((n) => !n.inAppRead).length ?? 0,
      reload: () => setReloadKey((k) => k + 1),
      markRead: async (id: string) => {
        if (items?.find((n) => n.id === id)?.inAppRead !== false) {
          return;
        }
        const updated = await markMyNotificationRead(id);
        setItems(
          (prev) => prev?.map((n) => (n.id === id ? updated : n)) ?? prev,
        );
      },
    }),
    [items, error],
  );
}
