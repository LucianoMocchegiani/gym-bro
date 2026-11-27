import { apiRequest, newIdempotencyKey } from '@/lib/api/client';
import type { ListResult } from '@/lib/api/list';
import type { PublicProduct } from '@/lib/api/public-tenant-catalog';

export function listPublicStoreProducts(
  slug: string,
  page: number,
): Promise<ListResult<PublicProduct>> {
  return apiRequest(
    `/public/tenants/by-slug/${encodeURIComponent(slug)}/products?page=${page}&pageSize=12`,
    { auth: false },
  );
}
