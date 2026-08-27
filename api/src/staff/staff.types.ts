/**
 * Resumen de rol asignado a un staff.
 */
export type StaffRoleSummary = {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
};

/**
 * Staff con roles (respuesta de asignación / detalle).
 */
export type StaffUserDetail = {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  active: boolean;
  roles: StaffRoleSummary[];
  createdAt: Date;
  updatedAt: Date;
};
