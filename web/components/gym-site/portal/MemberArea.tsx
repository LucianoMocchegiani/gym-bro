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
import { signOutOfGym } from '@/lib/auth/gym-context';
import type { MemberSession } from '@/lib/auth/member-session';
import { useMemberSession } from '@/lib/auth/useMemberSession';
import { useMemberCart } from '@/lib/member-cart';

type MemberAreaValue = {
  slug: string;
  session: MemberSession;
  /** Dueño del carrito: `tenantId:memberId`. */
  cartOwner: string;
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

const LINKS = [
  { href: '/cuenta', label: 'Inicio' },
  { href: '/cuenta/clases', label: 'Clases' },
  { href: '/cuenta/mis-clases', label: 'Mis clases' },
  { href: '/cuenta/tienda', label: 'Tienda' },
  { href: '/cuenta/carrito', label: 'Carrito' },
  { href: '/cuenta/historial', label: 'Historial' },
];

function CuentaNav({ cartOwner }: { cartOwner: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const cart = useMemberCart(cartOwner);
  return (
    <nav className="mkt-inner mkt-portal-nav" aria-label="Mi cuenta">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={pathname === link.href ? 'is-on' : undefined}
        >
          {link.label}
          {link.href === '/cuenta/carrito' && cart.count > 0 ? (
            <span className="mkt-portal-count">{cart.count}</span>
          ) : null}
        </Link>
      ))}
      <button
        type="button"
        className="mkt-portal-exit"
        onClick={() => {
          void signOutOfGym().then(() => router.replace('/'));
        }}
      >
        Salir
      </button>
    </nav>
  );
}

/**
 * Portal del socio (`/cuenta/*`): exige sesión de socio del gym del host
 * (si no, `/login?next=`), muestra el menú y expone la sesión por contexto.
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

  useEffect(() => {
    if (ready && !session) {
      const here = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(here)}`);
    }
  }, [ready, session, router]);

  const value = useMemo(
    () =>
      session
        ? { slug, session, cartOwner: `${session.tenantId}:${session.memberId}` }
        : null,
    [slug, session],
  );

  if (!value) {
    return <p className="muted mkt-inner mkt-section">Cargando tu cuenta…</p>;
  }
  return (
    <MemberAreaContext.Provider value={value}>
      <CuentaNav cartOwner={value.cartOwner} />
      {children}
    </MemberAreaContext.Provider>
  );
}
