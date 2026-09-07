import type { NavLink } from './slim.js';

export type NavEntry = {
  href: string;
  label: string;
  anyOf: readonly string[];
  keywords: readonly string[];
};

/**
 * Rutas Admin + permiso (espejo de `web/lib/nav-permissions.ts`) + keywords para suggest_nav.
 */
export const NAV_MAP: readonly NavEntry[] = [
  { href: '/', label: 'Inicio', anyOf: [], keywords: ['inicio', 'home'] },
  {
    href: '/puerta',
    label: 'Puerta',
    anyOf: ['access.verify', 'access.manual_pass'],
    keywords: ['puerta', 'ingreso', 'acceso', 'entrar'],
  },
  {
    href: '/caja',
    label: 'Caja',
    anyOf: ['cashier.operate'],
    keywords: ['caja', 'cobro', 'cobrar', 'efectivo'],
  },
  {
    href: '/arqueo',
    label: 'Arqueo',
    anyOf: ['cashier.operate'],
    keywords: ['arqueo', 'cierre'],
  },
  {
    href: '/devoluciones',
    label: 'Devoluciones',
    anyOf: ['transaction_items.refund'],
    keywords: ['devolucion', 'devoluciones', 'refund'],
  },
  {
    href: '/reportes',
    label: 'Reportes',
    anyOf: ['reports.read'],
    keywords: ['reporte', 'reportes', 'ingresos', 'numeros'],
  },
  {
    href: '/afiliados',
    label: 'Afiliados',
    anyOf: ['members.read'],
    keywords: ['afiliado', 'afiliados', 'socio', 'ficha', 'miembro'],
  },
  {
    href: '/staff',
    label: 'Staff',
    anyOf: ['staff.read'],
    keywords: ['staff', 'profesor', 'profesores'],
  },
  {
    href: '/roles',
    label: 'Roles y permisos',
    anyOf: ['roles.write'],
    keywords: ['rol', 'roles', 'permisos'],
  },
  {
    href: '/servicios',
    label: 'Servicios',
    anyOf: ['catalog.write'],
    keywords: ['servicio', 'servicios'],
  },
  {
    href: '/packs',
    label: 'Packs',
    anyOf: ['catalog.write'],
    keywords: ['pack', 'packs', 'plan'],
  },
  {
    href: '/sesiones',
    label: 'Sesiones',
    anyOf: ['sessions.write'],
    keywords: ['sesion', 'sesiones', 'clase', 'clases', 'calendario'],
  },
  {
    href: '/config',
    label: 'Configuración',
    anyOf: ['tenant.settings.read', 'tenant.settings.write', 'mp.connect'],
    keywords: ['config', 'ajustes', 'mercadopago', 'mp'],
  },
  {
    href: '/auditoria',
    label: 'Auditoría',
    anyOf: ['audit.read'],
    keywords: ['auditoria', 'audit', 'quien'],
  },
];

function allowed(entry: NavEntry, codes: Set<string>): boolean {
  if (entry.anyOf.length === 0) {
    return true;
  }
  return entry.anyOf.some((code) => codes.has(code));
}

export function suggestNavLinks(
  query: string,
  permissionCodes: string[],
): NavLink[] {
  const codes = new Set(permissionCodes);
  const q = query
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  const visible = NAV_MAP.filter((entry) => allowed(entry, codes));
  if (!q) {
    return visible.map(({ href, label }) => ({ href, label }));
  }
  const matched = visible.filter(
    (entry) =>
      entry.keywords.some((k) => k.includes(q) || q.includes(k)) ||
      entry.label.toLowerCase().includes(q) ||
      entry.href.includes(q),
  );
  return matched.map(({ href, label }) => ({ href, label }));
}
