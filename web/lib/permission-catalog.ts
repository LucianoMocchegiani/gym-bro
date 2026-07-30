/**
 * Catálogo de permisos del front (espejo de `api/src/roles/permission-catalog.ts`).
 */

export type PermissionOption = {
  code: string;
  description: string;
  dangerous: boolean;
};

export const PERMISSION_OPTIONS: readonly PermissionOption[] = [
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
  { code: 'members.read', description: 'Ver afiliados', dangerous: false },
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
  { code: 'staff.read', description: 'Ver staff', dangerous: false },
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
