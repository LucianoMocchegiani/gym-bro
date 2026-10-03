import { headers } from 'next/headers';
import {
  fetchPublicTenantCatalog,
  type PublicTenantCatalog,
} from '@/lib/api/public-tenant-catalog';
import { extractTenantSlugFromHost } from '@/lib/tenant-host';

/** Slug del gym del host del request (Server Components); null en el apex. */
export async function requestTenantSlug(): Promise<string | null> {
  const h = await headers();
  return extractTenantSlugFromHost(
    h.get('x-forwarded-host') ?? h.get('host') ?? '',
  );
}

/**
 * Gym del host con su catálogo público.
 *
 * @returns `null` en el apex o si el gym no existe / está suspendido.
 */
export async function resolveGymSite(): Promise<{
  slug: string;
  catalog: PublicTenantCatalog;
} | null> {
  const slug = await requestTenantSlug();
  if (!slug) {
    return null;
  }
  const catalog = await fetchPublicTenantCatalog(slug);
  return catalog ? { slug, catalog } : null;
}
