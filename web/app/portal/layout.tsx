import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { resolveGymSite } from '@/lib/gym-site';
import { GymSiteShell } from '@/components/gym-site/GymSiteShell';
import { SITE_DEFAULT_PRIMARY_COLOR } from '@/lib/api/tenant-site';

export const metadata: Metadata = { title: 'Portal', robots: { index: false, follow: false } };

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const site = await resolveGymSite();
  if (!site) notFound();
  const color = site.catalog.site?.themeColor ?? SITE_DEFAULT_PRIMARY_COLOR;
  return (
    <>
      <style>{`:root { --navigation-progress-color: ${color}; }`}</style>
      <GymSiteShell slug={site.slug} gymName={site.catalog.tenant.name} brandColor={color} brandIcon={site.catalog.site?.brandIcon ?? null} socialLinks={site.catalog.site?.socialLinks}>
        {children}
      </GymSiteShell>
    </>
  );
}
