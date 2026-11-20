import { notFound, redirect } from 'next/navigation';
import { resolveGymSite, requestTenantSlug } from '@/lib/gym-site';
import { IdentityAccountPage } from '@/components/IdentityAccountPage';
import { GymAccountPage } from '@/components/gym-site/GymAccountPage';
import { GymSiteShell } from '@/components/gym-site/GymSiteShell';
import { SITE_DEFAULT_PRIMARY_COLOR } from '@/lib/api/tenant-site';

export const metadata = { title: 'Cuenta', robots: { index: false, follow: false } };

export default async function CuentaPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await requestTenantSlug())) return <IdentityAccountPage />;
  const query = await searchParams;
  if (query.compra || query.alta) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (typeof value === 'string') params.set(key, value);
    redirect(`/portal?${params.toString()}`);
  }
  const site = await resolveGymSite();
  if (!site) notFound();
  const color = site.catalog.site?.themeColor ?? SITE_DEFAULT_PRIMARY_COLOR;
  return (
    <>
      <style>{`:root { --navigation-progress-color: ${color}; }`}</style>
      <GymSiteShell slug={site.slug} gymName={site.catalog.tenant.name} brandColor={color} brandIcon={site.catalog.site?.brandIcon ?? null} socialLinks={site.catalog.site?.socialLinks}>
        <GymAccountPage slug={site.slug} />
      </GymSiteShell>
    </>
  );
}
