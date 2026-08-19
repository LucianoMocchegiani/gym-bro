'use client';

import Link from 'next/link';
import {
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  NavIconDumbbell,
  NavIconForHref,
  NavIconMenu,
  NavIconSupport,
} from '@/components/AdminNavIcons';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/lib/auth/AuthProvider';
import { canAccessNavHref } from '@/lib/nav-permissions';
import { extractTenantSlugFromHost } from '@/lib/tenant-host';

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

type AdminShellProps = {
  title: ReactNode;
  children: ReactNode;
  /** Acciones extra a la derecha del título (ej. botones o tabs). */
  actions?: ReactNode;
  /** Subtítulo bajo el título (p. ej. hero de Inicio). */
  subtitle?: ReactNode;
  /** Variante de página para atmósfera (Inicio). */
  variant?: 'default' | 'home';
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
export function AdminShell({
  title,
  children,
  actions,
  subtitle,
  variant = 'default',
}: AdminShellProps) {
  const { session } = useAuth();
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

  function navClass(href: string): string {
    const active =
      href === '/'
        ? pathname === '/'
        : pathname === href || pathname.startsWith(`${href}/`);
    return `app-nav-link${active ? ' active' : ''}`;
  }

  function closeNav(): void {
    setNavOpen(false);
  }

  return (
    <div
      className={`app-shell${navOpen ? ' nav-open' : ''}${variant === 'home' ? ' app-shell-home' : ''}`}
    >
      <button
        type="button"
        className="app-overlay"
        aria-label="Cerrar menú"
        onClick={closeNav}
      />

      <aside className="app-sidebar" id="admin-sidebar" aria-label="Navegación">
        <div className="app-sidebar-brand">
          <Link href="/" className="brand-row" onClick={closeNav}>
            <span className="brand-mark" aria-hidden="true">
              <NavIconDumbbell />
            </span>
            <span className="brand-text">
              <span className="brand">{brandSlug}</span>
              <span className="eyebrow">Admin</span>
            </span>
          </Link>
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
                  <span className="app-nav-icon">
                    <NavIconForHref href={item.href} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="app-sidebar-support">
          <span className="app-sidebar-support-icon" aria-hidden="true">
            <NavIconSupport />
          </span>
          <div>
            <p className="app-sidebar-support-title">Soporte</p>
            <p className="muted small">¿Necesitás ayuda? Escribinos.</p>
          </div>
        </div>
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
                aria-label="Abrir menú"
                onClick={() => setNavOpen((open) => !open)}
              >
                <NavIconMenu />
              </button>
              {variant === 'home' ? (
                <p className="app-topbar-tagline muted small">
                  Panel de administración / Gestioná tu gym de forma{' '}
                  <span className="accent-text">simple y eficiente</span>.
                </p>
              ) : null}
            </div>
            <div className="app-topbar-right">
              <ThemeToggle />
              <Link
                href="/cuenta"
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
            <div className="app-page-head-copy">
              <h1>{title}</h1>
              {subtitle ? (
                <div className="app-page-subtitle">{subtitle}</div>
              ) : null}
            </div>
            {actions}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
