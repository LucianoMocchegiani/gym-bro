/**
 * Afiliado expuesto por la API (sin password).
 */
export type MemberDetail = {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  phone: string | null;
  document: string | null;
  branchId: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
};
