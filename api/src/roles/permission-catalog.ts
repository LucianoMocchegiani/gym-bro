/**
 * Catálogo global de permisos de producto (RN-ROL-003 / RN-ROL-009).
 *
 * @remarks Los códigos son fijos: la API autorizará por `code`, no por ruta HTTP.
 * Los roles por tenant eligen un subconjunto de esta lista.
 */
export type PermissionDefinition = {
  code: string;
  description: string;
  dangerous: boolean;
};

/** Slugs de roles sistema creados al alta de tenant (RN-ROL-002). */
export const SYSTEM_ROLE_SLUGS = {
  admin: 'admin',
  profesor: 'profesor',
} as const;

export type SystemRoleSlug =
  (typeof SYSTEM_ROLE_SLUGS)[keyof typeof SYSTEM_ROLE_SLUGS];

/**
 * Permisos MVP. Ampliar aquí cuando aparezcan módulos nuevos.
 */
export const PERMISSION_CATALOG: readonly PermissionDefinition[] = [
  {
    code: 'tenant.settings.read',
    description: 'Ver configuración del gym',
    dangerous: false,
  },
  {
    code: 'tenant.settings.write',
    description: 'Editar configuración del gym',
    dangerous: false,
  },
  {
    code: 'members.read',
    description: 'Ver afiliados',
    dangerous: false,
  },
  {
    code: 'members.write',
    description: 'Alta y edición de ficha de afiliados',
    dangerous: false,
  },
  {
    code: 'members.deactivate',
    description: 'Suspender o dar de baja afiliados',
    dangerous: true,
  },
  {
    code: 'staff.read',
    description: 'Ver staff',
    dangerous: false,
  },
  {
    code: 'staff.write',
    description: 'Alta y edición de staff; asignación de roles',
    dangerous: false,
  },
  {
    code: 'roles.write',
    description: 'Crear y editar roles custom',
    dangerous: false,
  },
  {
    code: 'catalog.write',
    description: 'Servicios, packs y precios',
    dangerous: false,
  },
  {
    code: 'sessions.write',
    description: 'Sesiones, cupos y calendario',
    dangerous: false,
  },
  {
    code: 'reservations.write',
    description: 'Reservas operadas por staff',
    dangerous: false,
  },
  {
    code: 'cashier.operate',
    description: 'Operar caja del día',
    dangerous: false,
  },
  {
    code: 'payments.refund',
    description: 'Devoluciones y reembolsos',
    dangerous: true,
  },
  {
    code: 'access.manual_pass',
    description: 'Pase manual en puerta',
    dangerous: true,
  },
  {
    code: 'access.verify',
    description: 'Verificar ingreso QR y ver historial de intentos',
    dangerous: false,
  },
  {
    code: 'routines.write',
    description: 'Catálogo y asignación de rutinas',
    dangerous: false,
  },
  {
    code: 'reports.read',
    description: 'Ver reportes mínimos',
    dangerous: false,
  },
  {
    code: 'audit.read',
    description: 'Ver eventos de auditoría del gym',
    dangerous: false,
  },
  {
    code: 'mp.connect',
    description: 'Conectar o cambiar cuenta Mercado Pago',
    dangerous: true,
  },
] as const;

/** Códigos asignados al rol sistema Profesor (Admin recibe todo el catálogo). */
export const PROFESOR_PERMISSION_CODES: readonly string[] = [
  'members.read',
  'sessions.write',
  'routines.write',
  'reports.read',
  'access.verify',
];
