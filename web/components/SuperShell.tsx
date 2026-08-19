'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { NavIconMenu } from '@/components/AdminNavIcons';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSuperAuth } from '@/lib/auth/SuperAuthProvider';

function accountInitials(name: string | null, email: string): string {
  const src = name?.trim();
  if (!src) {
    return email.slice(0, 1).toUpperCase();
  }
  const parts = src.split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

type SuperShellProps = {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

/**
 * Shell Super Admin: sidebar + topbar (tema / perfil / logout).
 */
export function SuperShell({ title, children, actions }: SuperShellProps) {
  const { session } = useSuperAuth();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  function navClass(href: string): string | undefined {
    if (href === '/super/tenants') {
      return pathname.startsWith('/super/tenants') ? 'active' : undefined;
    }
    return pathname === href ? 'active' : undefined;
  }

  function closeNav(): void {
    setNavOpen(false);
  }

  return (
    <div className={`app-shell${navOpen ? ' nav-open' : ''}`}>
      <button
        type="button"
        className="app-overlay"
        aria-label="Cerrar menú"
        onClick={closeNav}
      />

      <aside
        className="app-sidebar"
        id="super-sidebar"
        aria-label="Navegación Super"
      >
        <div className="app-sidebar-brand">
          <Link href="/super/tenants" className="brand" onClick={closeNav}>
            SUPER
          </Link>
          <span className="eyebrow">Plataforma</span>
        </div>

        <nav className="app-nav">
          <div className="app-nav-group">
            <p className="app-nav-label">Gestión</p>
            <Link
              href="/super/tenants"
              className={navClass('/super/tenants')}
              onClick={closeNav}
            >
              Tenants
            </Link>
          </div>
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-inner">
            <div className="app-topbar-left">
              <button
                type="button"
                className="app-menu-btn"
                aria-expanded={navOpen}
                aria-controls="super-sidebar"
                aria-label="Abrir menú"
                onClick={() => setNavOpen((open) => !open)}
              >
                <NavIconMenu />
              </button>
            </div>
            <div className="app-topbar-right">
              <ThemeToggle />
              <Link
                href="/super/cuenta"
                className="account-avatar-btn"
                title={session?.email ?? 'Mi cuenta'}
                aria-label="Mi cuenta"
              >
                {accountInitials(session?.name ?? null, session?.email ?? '')}
              </Link>
            </div>
          </div>
        </header>

        <div className="app-content">
          <div className="app-page-head admin-page-head">
            <h1>{title}</h1>
            {actions}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
