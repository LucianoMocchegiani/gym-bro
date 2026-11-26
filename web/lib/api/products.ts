import { apiMultipart, apiRequest } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';

export type ProductDetail = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stockQuantity: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductStockMovement = {
  id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  quantityDelta: number;
  quantityAfter: number;
  reason: string;
  createdBy: string | null;
  createdAt: string;
};

export type ProductInput = {
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
};

export type ProductListParams = ListParams & {
  q?: string;
  active?: boolean;
};

export function listProducts(params?: ProductListParams) {
  const query = toSearchParams(params);
  return apiRequest<ListResult<ProductDetail>>(`/products${query ? `?${query}` : ''}`);
}

export function createProduct(input: ProductInput) {
  return apiRequest<ProductDetail>('/products', { method: 'POST', body: input });
}

export function updateProduct(id: string, input: Partial<ProductInput> & { active?: boolean }) {
  return apiRequest<ProductDetail>(`/products/${id}`, { method: 'PATCH', body: input });
}

export function deleteProduct(id: string) {
  return apiRequest<void>(`/products/${id}`, { method: 'DELETE' });
}

export function listProductStockMovements(id: string, params?: ListParams) {
  const query = toSearchParams(params);
  return apiRequest<ListResult<ProductStockMovement>>(
    `/products/${id}/stock-movements${query ? `?${query}` : ''}`,
  );
}

export function adjustProductStock(id: string, input: {
  type: 'IN' | 'OUT';
  quantity: number;
  reason: string;
}) {
  return apiRequest<{ product: ProductDetail; movement: ProductStockMovement }>(
    `/products/${id}/stock-adjustments`,
    { method: 'POST', body: input },
  );
}

export async function uploadProductImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const uploaded = await apiMultipart<{ url: string }>('/products/image', formData);
  return uploaded.url;
}
