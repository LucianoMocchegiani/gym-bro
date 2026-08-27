/**
 * Servicio del catálogo expuesto por la API.
 */
export type ServiceDetail = {
  id: string;
  tenantId: string;
  type: 'ACCESO_LIBRE' | 'POR_SESIONES';
  name: string;
  description: string | null;
  imageUrl: string | null;
  dropInPrice: number | null;
  active: boolean;
  branchId: string | null;
  createdAt: Date;
  updatedAt: Date;
};
