/**
 * Services API (módulo `services`).
 */

import { apiRequest } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';

export type ServiceType = 'ACCESO_LIBRE' | 'POR_SESIONES';

export type ServiceDetail = {
  id: string;
  tenantId: string;
  type: ServiceType;
  name: string;
  description: string | null;
  imageUrl: string | null;
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
  imageUrl?: string;
  active?: boolean;
  dropInPrice?: number | null;
};

export type UpdateServiceInput = {
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  active?: boolean;
  dropInPrice?: number | null;
};

export type ListServicesInput = {
  type?: ServiceType;
  active?: boolean;
} & ListParams;

/**
 * Lista servicios (`catalog.write`), paginado.
 */
export function listServices(
  input?: ListServicesInput,
): Promise<ListResult<ServiceDetail>> {
  const qs = toSearchParams(input);
  return apiRequest<ListResult<ServiceDetail>>(
    `/services${qs ? `?${qs}` : ''}`,
  );
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

/**
 * Eliminación segura de servicio (409 `SERVICE_IN_USE` si está en uso).
 */
export function deleteService(serviceId: string): Promise<{ deleted: true }> {
  return apiRequest<{ deleted: true }>(`/services/${serviceId}`, {
    method: 'DELETE',
  });
}
