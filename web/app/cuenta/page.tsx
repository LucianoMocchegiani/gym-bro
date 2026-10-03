import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { extractTenantSlugFromHost } from '@/lib/tenant-host';
import { fetchPublicTenantCatalog } from '@/lib/api/public-tenant-catalog';
import { IdentityAccountPage } from '@/components/IdentityAccountPage';
import { GymSiteShell } from '@/components/gym-site/GymSiteShell';
import { MemberPortal } from '@/components/gym-site/MemberPortal';

export const metadata = {
  title: 'Cuenta',
  robots: { index: false, follow: false },
};

/**
 * Apex: gyms de la Identity. Slug de gym: portal del socio (la cuenta staff
 * vive en `/dashboard/cuenta`).
 */
export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{
    compra?: string;
    status?: string;
    collection_status?: string;
  }>;
}) {
  const h = await headers();
  const slug = extractTenantSlugFromHost(
    h.get('x-forwarded-host') ?? h.get('host') ?? '',
  );
  if (!slug) {
    return <IdentityAccountPage />;
  }
  const catalog = await fetchPublicTenantCatalog(slug);
  if (!catalog) {
    notFound();
  }
  const query = await searchParams;
  const purchase = query.compra
    ? {
        id: query.compra,
        status: query.collection_status ?? query.status ?? null,
      }
    : null;
  return (
    <GymSiteShell slug={slug} gymName={catalog.tenant.name}>
      <MemberPortal slug={slug} purchase={purchase} />
    </GymSiteShell>
  );
}
