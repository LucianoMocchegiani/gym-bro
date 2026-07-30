'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';

type AdminShellProps = {
  title: string;
  children: React.ReactNode;
  /** Acciones extra a la derecha del título (ej. botones o tabs). */
  actions?: React.ReactNode;
};

/**
 * Shell del panel Admin staff (nav + contenido centrado).
 */
export function AdminShell({ title, children, actions }: AdminShellProps) {
  const { session, logout } = useAuth();
  const pathname = usePathname();

  function navClass(href: string): string | undefined {
    if (href === '/afiliados') {
      return pathname.startsWith('/afiliados') ? 'active' : undefined;
    }
    if (href === '/puerta') {
      return pathname.startsWith('/puerta') ? 'active' : undefined;
    }
    if (href === '/caja') {
      return pathname.startsWith('/caja') ? 'active' : undefined;
    }
    return pathname === href ? 'active' : undefined;
  }

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <div className="admin-top-inner">
          <div className="admin-brand-block">
            <Link href="/afiliados" className="brand">
              GymBro
            </Link>
            <span className="muted small">Admin</span>
          </div>
          <nav className="admin-nav">
            <Link href="/afiliados" className={navClass('/afiliados')}>
              Afiliados
            </Link>
            <Link href="/caja" className={navClass('/caja')}>
              Caja
            </Link>
            <Link href="/puerta" className={navClass('/puerta')}>
              Puerta
            </Link>
            <span className="muted small">
              {session?.name ?? session?.email}
            </span>
            <button
              type="button"
              className="linkish"
              onClick={() => void logout()}
            >
              Salir
            </button>
          </nav>
        </div>
      </header>

      <div className="admin-content">
        <div className="admin-page-head">
          <h1>{title}</h1>
          {actions}
        </div>
        {children}
      </div>
    </div>
  );
}
