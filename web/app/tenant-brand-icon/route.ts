import { headers } from 'next/headers';
import { fetchPublicTenantCatalog } from '@/lib/api/public-tenant-catalog';
import { extractTenantSlugFromHost } from '@/lib/tenant-host';

export const dynamic = 'force-dynamic';

export async function GET() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? '';
  const slug = extractTenantSlugFromHost(host);
  const catalog = slug ? await fetchPublicTenantCatalog(slug) : null;
  const icon = catalog?.site?.brandIcon;
  if (!icon) {
    return new Response(null, { status: 404 });
  }

  return new Response(null, {
    status: 302,
    headers: { Location: icon, 'Cache-Control': 'public, max-age=60' },
  });
}
