import type { NavLink } from './slim.js';

export type NavEntry = {
  href: string;
  label: string;
  anyOf: readonly string[];
  /** Además de `anyOf`: hacen falta todos. */
  allOf?: readonly string[];
  keywords: readonly string[];
};

/**
 * Rutas Admin + permiso (espejo de `web/lib/nav-permissions.ts`) + keywords para suggest_nav.
 */
export const NAV_MAP: readonly NavEntry[] = [
  { href: '/dashboard', label: 'Inicio', anyOf: [], keywords: ['inicio', 'home'] },
  {
    href: '/dashboard/puerta',
    label: 'Puerta',
    anyOf: ['access.verify', 'access.manual_pass'],
    keywords: ['puerta', 'ingreso', 'acceso', 'entrar'],
  },
  {
    href: '/dashboard/caja',
    label: 'Caja',
    anyOf: ['cashier.operate'],
    keywords: ['caja', 'cobro', 'cobrar', 'efectivo'],
  },
  {
    href: '/dashboard/vencimientos',
    label: 'Vencimientos',
    anyOf: ['members.read'],
    keywords: ['vencimiento', 'vencimientos', 'renovar', 'tolerancia'],
  },
  {
    href: '/dashboard/arqueo',
    label: 'Arqueo',
    anyOf: ['cashier.operate'],
    keywords: ['arqueo', 'cierre'],
  },
  {
    href: '/dashboard/gastos',
    label: 'Gastos',
    anyOf: ['expenses.read'],
    keywords: ['gasto', 'gastos', 'egreso', 'egresos', 'comprobante', 'etiqueta'],
  },
  {
    href: '/dashboard/devoluciones',
    label: 'Devoluciones',
    anyOf: ['transaction_items.refund'],
    keywords: ['devolucion', 'devoluciones', 'refund'],
  },
  {
    href: '/dashboard/reportes',
    label: 'Reportes',
    anyOf: ['reports.read'],
    keywords: ['reporte', 'reportes', 'ingresos', 'numeros'],
  },
  {
    href: '/dashboard/afiliados',
    label: 'Afiliados',
    anyOf: ['members.read'],
    keywords: ['afiliado', 'afiliados', 'socio', 'ficha', 'miembro'],
  },
  {
    href: '/dashboard/afiliados/importar',
    label: 'Importar afiliados',
    anyOf: [],
    allOf: ['members.import', 'members.write'],
    keywords: [
      'importar',
      'importacion',
      'migrar',
      'migracion',
      'excel',
      'planilla',
      'csv',
      'zip',
    ],
  },
  {
    href: '/dashboard/staff',
    label: 'Staff',
    anyOf: ['staff.read'],
    keywords: ['staff', 'entrenador', 'profesor', 'profesores'],
  },
  {
    href: '/dashboard/roles',
    label: 'Roles y permisos',
    anyOf: ['roles.write'],
    keywords: ['rol', 'roles', 'permisos'],
  },
  {
    href: '/dashboard/servicios',
    label: 'Servicios',
    anyOf: ['catalog.write'],
    keywords: ['servicio', 'servicios'],
  },
  {
    href: '/dashboard/packs',
    label: 'Packs',
    anyOf: ['catalog.write'],
    keywords: ['pack', 'packs', 'plan'],
  },
  {
    href: '/dashboard/sesiones',
    label: 'Sesiones',
    anyOf: ['sessions.write'],
    keywords: ['sesion', 'sesiones', 'clase', 'clases', 'calendario'],
  },
  {
    href: '/dashboard/config',
    label: 'Configuración',
    anyOf: ['tenant.settings.read', 'tenant.settings.write', 'mp.connect'],
    keywords: ['config', 'ajustes', 'mercadopago', 'mp'],
  },
  {
    href: '/dashboard/avisos',
    label: 'Avisos',
    anyOf: ['tenant.settings.read', 'tenant.settings.write'],
    keywords: ['aviso', 'avisos', 'plantilla', 'notificacion', 'email'],
  },
  {
    href: '/dashboard/web',
    label: 'Web del gym',
    anyOf: ['tenant.settings.read', 'tenant.settings.write'],
    keywords: ['web', 'pagina', 'sitio', 'portada', 'slider', 'landing', 'vidriera'],
  },
  {
    href: '/dashboard/auditoria',
    label: 'Auditoría',
    anyOf: ['audit.read'],
    keywords: ['auditoria', 'audit', 'quien'],
  },
];

function allowed(entry: NavEntry, codes: Set<string>): boolean {
  if (entry.allOf && !entry.allOf.every((code) => codes.has(code))) {
    return false;
  }
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
