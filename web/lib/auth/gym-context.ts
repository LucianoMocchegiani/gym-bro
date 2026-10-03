import { listMemberships, selectContext, staffLogout } from '@/lib/api/auth';
import {
  clearIdentitySession,
  readIdentitySession,
} from '@/lib/auth/identity-session';
import {
  clearMemberSession,
  readMemberSession,
  writeMemberSession,
} from '@/lib/auth/member-session';
import {
  clearStaffSession,
  readStaffSession,
  writeStaffSession,
} from '@/lib/auth/session';
import { clearMemberCart } from '@/lib/member-cart';

export type GymProfile = 'STAFF' | 'MEMBER';

/** Perfiles de la cuenta Faciliter logueada en un gym. */
export type GymProfiles = {
  tenantId: string | null;
  tenantName: string | null;
  staff: boolean;
  member: boolean;
};

/**
 * Lee `GET /auth/memberships` (JWT Identity) y filtra por el gym del host.
 */
export async function resolveGymProfiles(slug: string): Promise<GymProfiles> {
  const { items } = await listMemberships();
  const rows = items.filter((row) => row.tenantSlug === slug);
  return {
    tenantId: rows[0]?.tenantId ?? null,
    tenantName: rows[0]?.tenantName ?? null,
    staff: rows.some((row) => row.profile === 'STAFF'),
    member: rows.some((row) => row.profile === 'MEMBER'),
  };
}

/**
 * Canjea Identity → JWT del gym y lo guarda en la sesión que corresponde
 * (staff = panel, member = portal del socio).
 */
export async function enterGym(input: {
  slug: string;
  tenantId: string;
  profile: GymProfile;
}): Promise<void> {
  const tokens = await selectContext({
    tenantId: input.tenantId,
    profile: input.profile,
  });
  if (input.profile === 'STAFF') {
    writeStaffSession(tokens, input.slug);
  } else {
    writeMemberSession(tokens, input.slug);
  }
}

/** Destino por defecto según perfil. */
export function homeForProfile(profile: GymProfile): string {
  return profile === 'STAFF' ? '/dashboard' : '/cuenta';
}

/** `?next=` del panel staff vs. del socio. */
export function profileForPath(path: string | null): GymProfile | null {
  if (!path) {
    return null;
  }
  if (path === '/dashboard' || path.startsWith('/dashboard/')) {
    return 'STAFF';
  }
  if (
    path === '/cuenta' ||
    path.startsWith('/cuenta?') ||
    path.startsWith('/cuenta/') ||
    path.startsWith('/comprar')
  ) {
    return 'MEMBER';
  }
  return null;
}

/**
 * Cierra todas las sesiones de este origen (staff, socio y cuenta Faciliter):
 * en la web del gym es una sola persona por navegador.
 */
export async function signOutOfGym(): Promise<void> {
  const tokens = [
    readStaffSession()?.refreshToken,
    readMemberSession()?.refreshToken,
    readIdentitySession()?.refreshToken,
  ].filter((t): t is string => Boolean(t));
  await Promise.all(tokens.map((t) => staffLogout(t)));
  clearStaffSession();
  clearMemberSession();
  clearIdentitySession();
  clearMemberCart();
}
