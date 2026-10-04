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

type MemberAreaValue = {
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
  { href: '/portal/documentos', label: 'Documentos' },
  { href: NOTICES_HREF, label: 'Avisos' },
];

/** Burbuja de contador (carrito, avisos sin leer). */
function PortalCount({ value }: { value: number }) {
  return value > 0 ? <span className="mkt-portal-count">{value}</span> : null;
}

function PortalNav({
  cartOwner,
  unread,
}: {
  cartOwner: string;
  unread: number;
}) {
  const pathname = usePathname();
  const cart = useMemberCart(cartOwner);
  const counts: Record<string, number> = {
    [CART_HREF]: cart.count,
    [NOTICES_HREF]: unread,
  };
  return (
    <nav className="mkt-inner mkt-portal-nav" aria-label="Portal del socio">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={pathname === link.href ? 'is-on' : undefined}
        >
          {link.label}
          <PortalCount value={counts[link.href] ?? 0} />
        </Link>
      ))}
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
  const { session, ready } = useMemberSession(slug);
  const notices = useMemberNotices(Boolean(session));

  useEffect(() => {
    if (ready && !session) {
      const here = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(here)}`);
    }
  }, [ready, session, router]);

  const value = useMemo(
    () =>
      session
        ? {
            slug,
            session,
            cartOwner: `${session.tenantId}:${session.memberId}`,
            notices,
          }
        : null,
    [slug, session, notices],
  );

  if (!value) {
    return <p className="muted mkt-inner mkt-section">Cargando tu cuenta…</p>;
  }
  return (
    <MemberAreaContext.Provider value={value}>
      <PortalNav cartOwner={value.cartOwner} unread={notices.unread} />
      {children}
    </MemberAreaContext.Provider>
  );
}
