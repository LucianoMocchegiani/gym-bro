/**
 * Permisos asignables a un rol del gym (espejo de `api/src/roles/permission-catalog.ts`, sin `platform.*`).
 */
export const GYM_PERMISSIONS: Readonly<Record<string, string>> = {
  'tenant.settings.read': 'Ver configuración del gym',
  'tenant.settings.write': 'Editar configuración del gym',
  'members.read': 'Ver afiliados',
  'members.write': 'Alta y edición de ficha de afiliados',
  'members.deactivate': 'Suspender o dar de baja afiliados',
  'members.import': 'Migrar afiliados masivamente',
  'staff.read': 'Ver staff',
  'staff.write': 'Alta y edición de staff; asignación de roles',
  'roles.write': 'Crear y editar roles',
  'catalog.write': 'Servicios, packs y precios',
  'sessions.write': 'Sesiones, cupos y calendario',
  'reservations.write': 'Reservas operadas por staff',
  'cashier.operate': 'Operar caja del día',
  'expenses.read': 'Ver gastos',
  'expenses.write': 'Cargar, editar y borrar gastos',
  'transaction_items.refund': 'Devoluciones',
  'access.manual_pass': 'Pase manual en puerta',
  'access.verify': 'Verificar ingreso e historial',
  'routines.write': 'Rutinas',
  'reports.read': 'Ver reportes',
  'audit.read': 'Ver auditoría',
  'mp.connect': 'Conectar Mercado Pago',
};

export const GYM_PERMISSION_CODES = Object.keys(GYM_PERMISSIONS);
