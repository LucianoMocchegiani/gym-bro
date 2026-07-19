import { TenantStatus } from '@prisma/client';

/**
 * Representación pública de un tenant para respuestas Super Admin.
 */
export type TenantResponse = {
  id: string;
  name: string;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
};
