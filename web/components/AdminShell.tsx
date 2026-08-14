'use client';

import Link from 'next/link';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/lib/auth/AuthProvider';
import { canAccessNavHref } from '@/lib/nav-permissions';
import { extractTenantSlugFromHost } from '@/lib/tenant-host';

type AdminShellProps = {
  title: string;
  children: React.ReactNode;
  /** Acciones extra a la derecha del título (ej. botones o tabs). */
  actions?: React.ReactNode;
};

type NavItem = { href: string; label: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operación',
    items: [
      { href: '/', label: 'Inicio' },
      { href: '/puerta', label: 'Puerta' },
      { href: '/caja', label: 'Caja' },
      { href: '/devoluciones', label: 'Devoluciones' },
      { href: '/reportes', label: 'Reportes' },
    ],
  },
  {
    label: 'Personas',
    items: [
      { href: '/afiliados', label: 'Afiliados' },
      { href: '/staff', label: 'Staff' },
      { href: '/roles', label: 'Roles' },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { href: '/servicios', label: 'Servicios' },
      { href: '/packs', label: 'Packs' },
      { href: '/sesiones', label: 'Sesiones' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/config', label: 'Config' },
      { href: '/auditoria', label: 'Auditoría' },
    ],
  },
];

function subscribeHost(): () => void {
  return () => undefined;
}

function readHostSlug(): string | null {
  return extractTenantSlugFromHost(window.location.host);
}

function getServerHostSlug(): null {
  return null;
}

/**
 * Shell Admin: sidebar de navegación + topbar (tema / perfil / logout).
 *
 * @remarks Filtra links según `session.permissionCodes` (GET /me/permissions).
 */
export function AdminShell({ title, children, actions }: AdminShellProps) {
  const { session, logout } = useAuth();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const hostSlug = useSyncExternalStore(
    subscribeHost,
    readHostSlug,
    getServerHostSlug,
  );
  const brandSlug = hostSlug ?? session?.tenantSlug?.trim() ?? '…';
  const permissionCodes = session?.permissionCodes ?? null;

  const visibleGroups = useMemo(() => {
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        canAccessNavHref(item.href, permissionCodes),
      ),
    })).filter((group) => group.items.length > 0);
  }, [permissionCodes]);

  function navClass(href: string): string | undefined {
    if (href === '/') {
      return pathname === '/' ? 'active' : undefined;
    }
    return pathname === href || pathname.startsWith(`${href}/`)
      ? 'active'
      : undefined;
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

      <aside className="app-sidebar" id="admin-sidebar" aria-label="Navegación">
        <div className="app-sidebar-brand">
          <Link href="/" className="brand" onClick={closeNav}>
            {brandSlug}
          </Link>
          <span className="eyebrow">Admin</span>
        </div>

        <nav className="app-nav">
          {visibleGroups.map((group) => (
            <div key={group.label} className="app-nav-group">
              <p className="app-nav-label">{group.label}</p>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navClass(item.href)}
                  onClick={closeNav}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
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
                aria-controls="admin-sidebar"
                onClick={() => setNavOpen((open) => !open)}
              >
                Menú
              </button>
            </div>
            <div className="app-topbar-right">
              <ThemeToggle />
              <button
                type="button"
                className="linkish"
                onClick={() => void logout()}
              >
                Salir
              </button>
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
