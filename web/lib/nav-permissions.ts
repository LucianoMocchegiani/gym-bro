/**
 * Mapa nav/atajos Admin → permisos requeridos (cualquiera de la lista).
 *
 * @remarks Ocultar link ≠ seguridad: la API sigue con `@RequirePermission`.
 * Inicio (`/`) no exige permiso.
 */

export type NavPermissionRule = {
  href: string;
  /** Vacío = siempre visible. */
  anyOf: readonly string[];
};

export const ADMIN_NAV_PERMISSIONS: readonly NavPermissionRule[] = [
  { href: '/', anyOf: [] },
  { href: '/puerta', anyOf: ['access.verify', 'access.manual_pass'] },
  { href: '/caja', anyOf: ['cashier.operate'] },
  { href: '/arqueo', anyOf: ['cashier.operate'] },
  { href: '/devoluciones', anyOf: ['transaction_items.refund'] },
  { href: '/reportes', anyOf: ['reports.read'] },
  { href: '/afiliados', anyOf: ['members.read'] },
  { href: '/staff', anyOf: ['staff.read'] },
  { href: '/roles', anyOf: ['roles.write'] },
  { href: '/servicios', anyOf: ['catalog.write'] },
  { href: '/packs', anyOf: ['catalog.write'] },
  { href: '/sesiones', anyOf: ['sessions.write'] },
  {
    href: '/config',
    anyOf: ['tenant.settings.read', 'tenant.settings.write', 'mp.connect'],
  },
  { href: '/auditoria', anyOf: ['audit.read'] },
] as const;

/**
 * True si el href puede mostrarse con los códigos dados.
 *
 * @param permissionCodes `null` = aún no cargados → mostrar todo (evita flash vacío).
 */
export function canAccessNavHref(
  href: string,
  permissionCodes: string[] | null | undefined,
): boolean {
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
