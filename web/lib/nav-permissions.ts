/**
 * Mapa nav/atajos Admin → permisos requeridos (cualquiera de la lista).
 *
 * @remarks Ocultar link ≠ seguridad: la API sigue con `@RequirePermission`.
 * Inicio (`/dashboard`) no exige permiso. El panel vive bajo `/dashboard`;
 * la raíz del host del gym es su landing pública.
 */

export type NavPermissionRule = {
  href: string;
  /** Vacío = siempre visible. */
  anyOf: readonly string[];
};

export const ADMIN_NAV_PERMISSIONS: readonly NavPermissionRule[] = [
  { href: '/dashboard', anyOf: [] },
  { href: '/dashboard/puerta', anyOf: ['access.verify', 'access.manual_pass'] },
  { href: '/dashboard/caja', anyOf: ['cashier.operate'] },
  { href: '/dashboard/vencimientos', anyOf: ['members.read'] },
  { href: '/dashboard/arqueo', anyOf: ['cashier.operate'] },
  { href: '/dashboard/gastos', anyOf: ['expenses.read'] },
  { href: '/dashboard/devoluciones', anyOf: ['transaction_items.refund'] },
  { href: '/dashboard/reportes', anyOf: ['reports.read'] },
  { href: '/dashboard/afiliados', anyOf: ['members.read'] },
  { href: '/dashboard/staff', anyOf: ['staff.read'] },
  { href: '/dashboard/roles', anyOf: ['roles.write'] },
  { href: '/dashboard/servicios', anyOf: ['catalog.write'] },
  { href: '/dashboard/packs', anyOf: ['catalog.write'] },
  { href: '/dashboard/sesiones', anyOf: ['sessions.write'] },
  {
    href: '/dashboard/config',
    anyOf: ['tenant.settings.read', 'tenant.settings.write', 'mp.connect'],
  },
  {
    href: '/dashboard/avisos',
    anyOf: ['tenant.settings.read', 'tenant.settings.write'],
  },
  { href: '/dashboard/plan', anyOf: ['tenant.settings.read'] },
  { href: '/dashboard/auditoria', anyOf: ['audit.read'] },
  // Gestión de gyms: solo el tenant `admin` (además la API exige el slug).
  { href: '/dashboard/tenants', anyOf: ['platform.tenants.read'] },
] as const;

/**
 * True si el href puede mostrarse con los códigos dados.
 *
 * @param permissionCodes `null` = aún no cargados → mostrar todo (evita flash vacío).
 */
export function canAccessNavHref(
  href: string,
  permissionCodes: string[] | null | undefined,
  platformAccess?: 'ok' | 'limited' | null,
): boolean {
  if (platformAccess === 'limited') {
    return href === '/dashboard/plan';
  }
  if (permissionCodes === null || permissionCodes === undefined) {
    return true;
  }
  const rule = ADMIN_NAV_PERMISSIONS.find((r) => r.href === href);
  if (!rule || rule.anyOf.length === 0) {
    return true;
  }
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
