/**
 * Rol con permisos para respuestas de API.
 */
export type RoleDetail = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  isSystem: boolean;
  permissionCodes: string[];
  createdAt: Date;
  updatedAt: Date;
};
