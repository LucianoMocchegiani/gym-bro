/**
 * Mapa nav/atajos Admin → permisos requeridos (cualquiera de la lista).
 *
 * @remarks Ocultar link ≠ seguridad: la API sigue con `@RequirePermission` y
 * `@RequirePlatformModule`. Inicio (`/dashboard`) no exige permiso. El panel vive bajo `/dashboard`;
 * la raíz del host del gym es su landing pública.
 */

export type NavPermissionRule = {
  href: string;
  /** Vacío = siempre visible. */
  anyOf: readonly string[];
  module?: string;
};

export const ADMIN_NAV_PERMISSIONS: readonly NavPermissionRule[] = [
  { href: '/dashboard', anyOf: [] },
  { href: '/dashboard/puerta', anyOf: ['access.verify', 'access.manual_pass'], module: 'club' },
  { href: '/dashboard/credencial', anyOf: [], module: 'club' },
  { href: '/dashboard/caja', anyOf: ['cashier.operate'] },
  { href: '/dashboard/vencimientos', anyOf: ['members.read'], module: 'club' },
  { href: '/dashboard/arqueo', anyOf: ['cashier.operate'] },
  { href: '/dashboard/gastos', anyOf: ['expenses.read'] },
  { href: '/dashboard/devoluciones', anyOf: ['transaction_items.refund'], module: 'club' },
  { href: '/dashboard/reportes', anyOf: ['reports.read'] },
  { href: '/dashboard/afiliados', anyOf: ['members.read'], module: 'club' },
  { href: '/dashboard/staff', anyOf: ['staff.read'] },
  { href: '/dashboard/roles', anyOf: ['roles.write'] },
  { href: '/dashboard/servicios', anyOf: ['catalog.write'], module: 'club' },
  { href: '/dashboard/packs', anyOf: ['catalog.write'], module: 'club' },
  { href: '/dashboard/sesiones', anyOf: ['sessions.write'], module: 'club' },
  {
    href: '/dashboard/config',
    anyOf: ['tenant.settings.read', 'tenant.settings.write', 'mp.connect'],
    module: 'club',
  },
  {
    href: '/dashboard/avisos',
    anyOf: ['tenant.settings.read', 'tenant.settings.write'],
    module: 'club',
  },
  {
    href: '/dashboard/web',
    anyOf: ['tenant.settings.read', 'tenant.settings.write'],
    module: 'club',
  },
  { href: '/dashboard/plan', anyOf: ['tenant.settings.read'] },
  { href: '/dashboard/auditoria', anyOf: ['audit.read'] },
  // Gestión de tenants y planes de plataforma: solo admin (la API exige slug).
  { href: '/dashboard/tenants', anyOf: ['platform.tenants.read'] },
  { href: '/dashboard/planes', anyOf: ['platform.tenants.read'] },
] as const;

/**
 * True si el href puede mostrarse con los códigos dados.
 *
 * @param permissionCodes `null` = aún no cargados → mostrar todo (evita flash vacío).
 * @param platformModules `null` = aún no cargados → ocultar módulos hasta resolver el plan.
 */
export function canAccessNavHref(
  href: string,
  permissionCodes: string[] | null | undefined,
  platformAccess?: 'ok' | 'limited' | null,
  platformModules?: string[] | null,
): boolean {
  if (platformAccess === 'limited') {
    return href === '/dashboard/plan';
  }
  const rule = ADMIN_NAV_PERMISSIONS.find((item) => item.href === href);
  if (!rule) return true;
  if (rule.module && !platformModules?.includes(rule.module)) return false;
  if (permissionCodes === null || permissionCodes === undefined) {
    return true;
  }
  if (rule.anyOf.length === 0) return true;
  const set = new Set(permissionCodes);
  return rule.anyOf.some((code) => set.has(code));
}

/**
 * True si tiene todos los códigos (permisos ya hidratados).
 */
export function hasAllPermissions(
  permissionCodes: string[] | null | undefined,
  codes: readonly string[],
): boolean {
  if (!permissionCodes || codes.length === 0) {
    return false;
  }
  const set = new Set(permissionCodes);
  return codes.every((code) => set.has(code));
}

/**
 * True si tiene al menos uno de los códigos (permisos ya hidratados).
 */
export function hasAnyPermission(
  permissionCodes: string[] | null | undefined,
  codes: readonly string[],
): boolean {
  if (!permissionCodes || codes.length === 0) {
    return false;
  }
  const set = new Set(permissionCodes);
  return codes.some((code) => set.has(code));
}
