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
 * Owner Admin creado junto al tenant (CU-ROL-001).
 */
export type OwnerSummary = {
  id: string;
  email: string;
  name: string | null;
};

/**
 * Representación pública de un tenant para respuestas Super Admin.
 */
export type TenantResponse = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
  defaultBranch: BranchSummary | null;
  systemRoles: RoleSummary[];
  /** Presente en create; en get/list puede ser null si no se resolvió. */
  owner: OwnerSummary | null;
};

/**
 * Vista pública mínima para resolver subdominio (login Staff).
 */
export type PublicTenantSummary = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
};
