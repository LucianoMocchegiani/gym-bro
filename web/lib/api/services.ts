/**
 * Services API (módulo `services`).
 */

import { apiRequest } from '@/lib/api/client';

export type ServiceType = 'ACCESO_LIBRE' | 'POR_SESIONES';

export type ServiceDetail = {
  id: string;
  tenantId: string;
  type: ServiceType;
  name: string;
  description: string | null;
  dropInPrice: number | null;
  active: boolean;
  branchId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateServiceInput = {
  type: ServiceType;
  name: string;
  description?: string;
  active?: boolean;
  dropInPrice?: number | null;
};

export type UpdateServiceInput = {
  name?: string;
  description?: string | null;
  active?: boolean;
  dropInPrice?: number | null;
};

/**
 * Lista servicios (`catalog.write`).
 */
export function listServices(input?: {
  type?: ServiceType;
  active?: boolean;
}): Promise<ServiceDetail[]> {
  const params = new URLSearchParams();
  if (input?.type) {
    params.set('type', input.type);
  }
  if (input?.active !== undefined) {
    params.set('active', String(input.active));
  }
  const q = params.toString();
  return apiRequest<ServiceDetail[]>(`/services${q ? `?${q}` : ''}`);
}

/**
 * Detalle de servicio.
 */
export function getService(serviceId: string): Promise<ServiceDetail> {
  return apiRequest<ServiceDetail>(`/services/${serviceId}`);
}

/**
 * Alta de servicio (CU-SER-001).
 */
export function createService(
  input: CreateServiceInput,
): Promise<ServiceDetail> {
  return apiRequest<ServiceDetail>('/services', {
    method: 'POST',
    body: input,
  });
}

/**
 * Edición de servicio (sin cambiar type).
 */
export function updateService(
  serviceId: string,
  input: UpdateServiceInput,
): Promise<ServiceDetail> {
  return apiRequest<ServiceDetail>(`/services/${serviceId}`, {
    method: 'PATCH',
    body: input,
  });
}
