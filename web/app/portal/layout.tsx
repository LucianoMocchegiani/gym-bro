import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { resolveGymSite } from '@/lib/gym-site';
import { GymSiteShell } from '@/components/gym-site/GymSiteShell';
import { SITE_DEFAULT_PRIMARY_COLOR } from '@/lib/api/tenant-site';
import { MemberPortalFeaturesProvider } from '@/components/gym-site/portal/MemberArea';

export const metadata: Metadata = {
  title: 'Portal',
  robots: { index: false, follow: false },
};

/** Portal del socio en la web del gym (`{slug}/portal/*`); 404 en el apex. */
export default async function PortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const site = await resolveGymSite();
  if (!site) {
    notFound();
  }
  const color = site.catalog.site?.themeColor ?? SITE_DEFAULT_PRIMARY_COLOR;
  return (
    <MemberPortalFeaturesProvider
      hasPlans={site.catalog.hasPlans}
      hasProducts={site.catalog.hasProducts}
    >
      <>
        <style>{`:root { --navigation-progress-color: ${color}; }`}</style>
        <GymSiteShell
          slug={site.slug}
          gymName={site.catalog.tenant.name}
          brandColor={color}
          brandIcon={site.catalog.site?.brandIcon ?? null}
          socialLinks={site.catalog.site?.socialLinks}
          showPlans={site.catalog.hasPlans}
          showProducts={site.catalog.hasProducts}
        >
          {children}
        </GymSiteShell>
      </>
    </MemberPortalFeaturesProvider>
  );
}
