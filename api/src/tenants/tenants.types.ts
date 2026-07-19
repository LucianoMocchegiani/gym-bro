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
 * Representación pública de un tenant para respuestas Super Admin.
 *
 * @remarks `defaultBranch` es null en tenants creados antes de la migración
 * de sucursales (sin backfill en esta tarea).
 */
export type TenantResponse = {
  id: string;
  name: string;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
  defaultBranch: BranchSummary | null;
};
