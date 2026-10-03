'use client';

import { useSyncExternalStore } from 'react';
import {
  getMemberSessionServerSnapshot,
  readMemberSession,
  subscribeMemberSession,
  type MemberSession,
} from '@/lib/auth/member-session';

function subscribeAlways(): () => void {
  return () => undefined;
}

/**
 * Sesión de socio del gym del host. Una sesión de otro gym cuenta como ausente.
 */
export function useMemberSession(slug: string): {
  session: MemberSession | null;
  ready: boolean;
} {
  const stored = useSyncExternalStore(
    subscribeMemberSession,
    readMemberSession,
    getMemberSessionServerSnapshot,
  );
  const ready = useSyncExternalStore(
    subscribeAlways,
    () => true,
    () => false,
  );
  return {
    session: stored?.tenantSlug === slug ? stored : null,
    ready,
  };
}
