'use client';

import type { SessionKind } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useIdentityAuth } from '@/lib/auth/IdentityAuthProvider';
import { useMemberSession } from '@/lib/auth/useMemberSession';

/**
 * Quién está en el gym del host, igual para el panel, el header y `/cuenta`:
 * la cuenta Faciliter, si no el socio, si no el staff. En una impersonación
 * manda la sesión staff.
 */
export function useGymAccountPerson(slug: string) {
  const { session: identity, ready: identityReady } = useIdentityAuth();
  const { session: member, ready: memberReady } = useMemberSession(slug);
  const { session: staff, ready: staffReady } = useAuth();
  const impersonating = staff?.impersonating === true;
  const person = impersonating ? staff : (identity ?? member ?? staff);
  const sessionKind: SessionKind | null = !person
    ? null
    : person === identity
      ? 'identity'
      : person === member
        ? 'member'
        : 'staff';
  return {
    ready: identityReady && memberReady && staffReady,
    identity,
    member,
    staff,
    impersonating,
    person,
    /** Sesión de `person` (para la contraseña). */
    sessionKind,
  };
}
