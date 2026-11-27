'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type { MemberSession } from '@/lib/auth/member-session';
import { useMemberSession } from '@/lib/auth/useMemberSession';
import { useMemberCart } from '@/lib/member-cart';
import { useMemberNotices, type MemberNotices } from './useMemberNotices';

type MemberPortalFeatures = { hasPlans: boolean; hasProducts: boolean };
const MemberPortalFeaturesContext = createContext<MemberPortalFeatures>({
  hasPlans: true,
  hasProducts: false,
});

export function MemberPortalFeaturesProvider({
  children,
  ...features
}: MemberPortalFeatures & { children: ReactNode }) {
  return (
    <MemberPortalFeaturesContext.Provider value={features}>
      {children}
    </MemberPortalFeaturesContext.Provider>
  );
}

type MemberAreaValue = MemberPortalFeatures & {
  slug: string;
  session: MemberSession;
  /** Dueño del carrito: `tenantId:memberId`. */
  cartOwner: string;
  notices: MemberNotices;
};

const MemberAreaContext = createContext<MemberAreaValue | null>(null);

/** Socio logueado del portal; solo dentro de {@link MemberArea}. */
export function useMemberArea(): MemberAreaValue {
  const value = useContext(MemberAreaContext);
  if (!value) {
    throw new Error('useMemberArea fuera de MemberArea');
  }
  return value;
}

const CART_HREF = '/portal/carrito';
const NOTICES_HREF = '/portal/avisos';

const LINKS = [
  { href: '/portal', label: 'Inicio' },
  { href: '/portal/clases', label: 'Clases' },
  { href: '/portal/mis-clases', label: 'Mis clases' },
  { href: '/portal/tienda', label: 'Tienda' },
  { href: CART_HREF, label: 'Carrito' },
  { href: '/portal/historial', label: 'Historial' },
  { href: '/portal/acceso', label: 'Acceso' },
  { href: '/portal/documentos', label: 'Documentos' },
  { href: NOTICES_HREF, label: 'Avisos' },
];
const ECOMMERCE_LINKS = new Set([
  '/portal',
  '/portal/tienda',
  CART_HREF,
  '/portal/historial',
]);
const CLUB_ONLY_PATHS = new Set([
  '/portal/clases',
  '/portal/mis-clases',
  '/portal/acceso',
  '/portal/documentos',
  NOTICES_HREF,
]);

/** Burbuja de contador (carrito, avisos sin leer). */
function PortalCount({ value }: { value: number }) {
  return value > 0 ? <span className="mkt-portal-count">{value}</span> : null;
}

function PortalNav({
  cartOwner,
  unread,
  hasPlans,
}: {
  cartOwner: string;
  unread: number;
  hasPlans: boolean;
}) {
  const pathname = usePathname();
  const cart = useMemberCart(cartOwner);
  const counts: Record<string, number> = {
    [CART_HREF]: cart.count,
    [NOTICES_HREF]: unread,
  };
  return (
    <nav className="mkt-inner mkt-portal-nav" aria-label="Portal del socio">
      {LINKS.filter((link) => hasPlans || ECOMMERCE_LINKS.has(link.href)).map(
        (link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname === link.href ? 'is-on' : undefined}
          >
            {link.label}
            <PortalCount value={counts[link.href] ?? 0} />
          </Link>
        ),
      )}
    </nav>
  );
}

/**
 * Portal del socio (`/portal/*`): exige sesión de socio del gym del host
 * (si no, `/login?next=`), muestra el menú y expone por contexto la sesión,
 * el carrito y la bandeja de avisos (un solo fetch para menú, inicio y avisos).
 * Cerrar sesión está en la cuenta (`/cuenta`, avatar del header).
 */
export function MemberArea({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const features = useContext(MemberPortalFeaturesContext);
  const { session, ready } = useMemberSession(slug);
  const notices = useMemberNotices(Boolean(session) && features.hasPlans);

  useEffect(() => {
    if (ready && !session) {
      const here = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(here)}`);
    } else if (ready && session && !features.hasPlans && CLUB_ONLY_PATHS.has(pathname)) {
      router.replace('/portal');
    }
  }, [ready, session, features.hasPlans, pathname, router]);

  const value = useMemo(
    () =>
      session
        ? {
            slug,
            session,
            cartOwner: `${session.tenantId}:${session.memberId}`,
            notices,
            ...features,
          }
        : null,
    [slug, session, notices, features],
  );

  if (!value || (!features.hasPlans && CLUB_ONLY_PATHS.has(pathname))) {
    return <p className="muted mkt-inner mkt-section">Cargando tu cuenta…</p>;
  }
  return (
    <MemberAreaContext.Provider value={value}>
      <PortalNav
        cartOwner={value.cartOwner}
        unread={notices.unread}
        hasPlans={features.hasPlans}
      />
      {children}
    </MemberAreaContext.Provider>
  );
}
