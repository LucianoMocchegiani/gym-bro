'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSuperAuth } from '@/lib/auth/SuperAuthProvider';

type SuperShellProps = {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

/**
 * Shell del panel Super Admin (plataforma).
 */
export function SuperShell({ title, children, actions }: SuperShellProps) {
  const { session, logout } = useSuperAuth();
  const pathname = usePathname();

  function navClass(href: string): string | undefined {
    if (href === '/super/tenants') {
      return pathname.startsWith('/super/tenants') ? 'active' : undefined;
    }
    return pathname === href ? 'active' : undefined;
  }

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <div className="admin-top-inner">
          <div className="admin-brand-block">
            <Link href="/super/tenants" className="brand">
              GymBro
            </Link>
            <span className="muted small">Super Admin</span>
          </div>
          <nav className="admin-nav">
            <Link
              href="/super/tenants"
              className={navClass('/super/tenants')}
            >
              Tenants
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
