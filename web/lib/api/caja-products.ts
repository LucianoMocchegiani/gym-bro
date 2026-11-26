import { apiRequest } from '@/lib/api/client';
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

export function listProducts(params?: ListParams & { active?: boolean }) {
  const query = toSearchParams(params);
  return apiRequest<ListResult<ProductDetail>>(`/products${query ? `?${query}` : ''}`);
}
