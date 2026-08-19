import type { ReactNode } from 'react';

/** Iconos de línea para sidebar Admin (16px). */

function Svg({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function NavIconHome() {
  return (
    <Svg>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </Svg>
  );
}

export function NavIconDoor() {
  return (
    <Svg>
      <path d="M4 21V5a2 2 0 0 1 2-2h8v18" />
      <path d="M14 3h4a2 2 0 0 1 2 2v16" />
      <path d="M10 12h.01" />
    </Svg>
  );
}

export function NavIconCash() {
  return (
    <Svg>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </Svg>
  );
}

export function NavIconRefund() {
  return (
    <Svg>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </Svg>
  );
}

export function NavIconChart() {
  return (
    <Svg>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16v-5" />
      <path d="M12 16V8" />
      <path d="M16 16v-3" />
    </Svg>
  );
}

export function NavIconPeople() {
  return (
    <Svg>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 19a4.5 4.5 0 0 0-6-4.2" />
    </Svg>
  );
}

export function NavIconStaff() {
  return (
    <Svg>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Svg>
  );
}

export function NavIconRoles() {
  return (
    <Svg>
      <path d="M12 3 4 7v5c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V7l-8-4Z" />
    </Svg>
  );
}

export function NavIconService() {
  return (
    <Svg>
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="m4.9 4.9 2.8 2.8" />
      <path d="m16.3 16.3 2.8 2.8" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="m4.9 19.1 2.8-2.8" />
      <path d="m16.3 7.7 2.8-2.8" />
    </Svg>
  );
}

export function NavIconPack() {
  return (
    <Svg>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 16l9 5 9-5" />
      <path d="M3 12l9 5 9-5" />
    </Svg>
  );
}

export function NavIconSession() {
  return (
    <Svg>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </Svg>
  );
}

export function NavIconConfig() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </Svg>
  );
}

export function NavIconAudit() {
  return (
    <Svg>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </Svg>
  );
}

export function NavIconSupport() {
  return (
    <Svg>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <path d="M4 14v2a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2Z" />
      <path d="M20 14v2a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2Z" />
    </Svg>
  );
}

export function NavIconDumbbell() {
  return (
    <Svg className="brand-mark-svg">
      <path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" />
    </Svg>
  );
}

export function NavIconSun() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  );
}

export function NavIconMoon() {
  return (
    <Svg>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </Svg>
  );
}

export function NavIconMenu() {
  return (
    <Svg>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Svg>
  );
}

const NAV_ICONS: Record<string, () => ReactNode> = {
  '/': NavIconHome,
  '/puerta': NavIconDoor,
  '/caja': NavIconCash,
  '/devoluciones': NavIconRefund,
  '/reportes': NavIconChart,
  '/afiliados': NavIconPeople,
  '/staff': NavIconStaff,
  '/roles': NavIconRoles,
  '/servicios': NavIconService,
  '/packs': NavIconPack,
  '/sesiones': NavIconSession,
  '/config': NavIconConfig,
  '/auditoria': NavIconAudit,
};

/**
 * Icono de nav por href (fallback: home).
 */
export function NavIconForHref({ href }: { href: string }) {
  const Icon = NAV_ICONS[href] ?? NavIconHome;
  return <Icon />;
}

export function KpiIconPeople() {
  return <NavIconPeople />;
}

export function KpiIconCash() {
  return <NavIconCash />;
}

export function KpiIconDoor() {
  return <NavIconDoor />;
}

export function KpiIconPack() {
  return <NavIconPack />;
}

export function KpiIconSession() {
  return <NavIconSession />;
}
