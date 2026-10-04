'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AccountAvatarLink } from '@/components/AccountAvatarLink';
import { AssistantLauncher } from '@/components/assistant/AssistantDrawer';
import { PlanLimitedNotice } from '@/components/PlanLimitedNotice';
import {
  NavIconDumbbell,
  NavIconForHref,
  NavIconMenu,
} from '@/components/AdminNavIcons';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/lib/auth/AuthProvider';
import { canAccessNavHref } from '@/lib/nav-permissions';
import { extractTenantSlugFromHost } from '@/lib/tenant-host';

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
      { href: '/dashboard', label: 'Inicio' },
      { href: '/dashboard/puerta', label: 'Puerta' },
      { href: '/dashboard/caja', label: 'Caja' },
      { href: '/dashboard/vencimientos', label: 'Vencimientos' },
      { href: '/dashboard/arqueo', label: 'Cierre' },
      { href: '/dashboard/gastos', label: 'Gastos' },
      { href: '/dashboard/devoluciones', label: 'Solicitudes de devolución' },
      { href: '/dashboard/reportes', label: 'Reportes' },
    ],
  },
  {
    label: 'Personas',
    items: [
      { href: '/dashboard/afiliados', label: 'Afiliados' },
      { href: '/dashboard/tenants', label: 'Tenants' },
      { href: '/dashboard/staff', label: 'Staff' },
      { href: '/dashboard/roles', label: 'Roles y permisos' },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { href: '/dashboard/servicios', label: 'Servicios' },
      { href: '/dashboard/packs', label: 'Packs' },
      { href: '/dashboard/sesiones', label: 'Sesiones' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/dashboard/config', label: 'Config' },
      { href: '/dashboard/avisos', label: 'Avisos' },
      { href: '/dashboard/plan', label: 'Plan / Uso' },
      { href: '/dashboard/auditoria', label: 'Auditoría' },
    ],
  },
];

function navGroupsForTenant(slug: string | null): NavGroup[] {
  const isAdmin = slug === 'admin';
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (isAdmin) {
        if (item.href === '/dashboard/puerta') return false;
        if (item.href === '/dashboard/sesiones') return false;
        if (item.href === '/dashboard/afiliados') return false;
        if (item.href === '/dashboard/plan') return false;
        if (item.href === '/dashboard/avisos') return false;
      } else if (item.href === '/dashboard/tenants') {
        return false;
      }
      return true;
    }),
  })).filter((group) => group.items.length > 0);
}

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
 * Shell Admin: sidebar de navegación + topbar (tema / perfil).
 * El asistente es burbuja fija (no va en el topbar).
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
  const platformAccess = session?.platformAccess ?? 'ok';
  const limited = platformAccess === 'limited';
  const router = useRouter();

  useEffect(() => {
    if (!limited) {
      return;
    }
    if (pathname === '/dashboard/plan') {
      return;
    }
    router.replace('/dashboard/plan');
  }, [limited, pathname, router]);

  const visibleGroups = useMemo(() => {
    // El host manda: la nav del host es la que se muestra. La sesión ya fue
    // reconciliada contra el host en `RequireStaff`.
    const groups = navGroupsForTenant(hostSlug);
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          canAccessNavHref(item.href, permissionCodes, platformAccess),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [permissionCodes, hostSlug, platformAccess]);

  function navClass(href: string): string {
    const active =
      href === '/dashboard'
        ? pathname === '/dashboard'
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
          <Link href="/dashboard" className="brand-row" onClick={closeNav}>
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
              <AccountAvatarLink
                href="/cuenta"
                name={session?.name}
                email={session?.email}
              />
            </div>
          </div>
          {limited ? (
            <PlanLimitedNotice tenantId={session?.tenantId ?? null} />
          ) : null}
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
      {limited ? null : <AssistantLauncher />}
    </div>
  );
}
