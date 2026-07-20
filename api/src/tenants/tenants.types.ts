import { TenantStatus } from '@prisma/client';

/**
 * Sucursal expuesta en respuestas de tenant (sede default S2).
 */
export type BranchSummary = {
  id: string;
  name: string;
  active: boolean;
  isDefault: boolean;
};

/**
 * Rol sistema sembrado al crear el tenant (Admin / Profesor).
 */
export type RoleSummary = {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
  permissionCodes: string[];
};

/**
 * Representación pública de un tenant para respuestas Super Admin.
 *
 * @remarks `defaultBranch` / `systemRoles` pueden ser null/[] en tenants
 * creados antes de esas migraciones (sin backfill).
 */
export type TenantResponse = {
  id: string;
  name: string;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
  defaultBranch: BranchSummary | null;
  systemRoles: RoleSummary[];
};
