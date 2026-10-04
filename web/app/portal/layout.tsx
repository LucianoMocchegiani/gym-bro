import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { resolveGymSite } from '@/lib/gym-site';
import { GymSiteShell } from '@/components/gym-site/GymSiteShell';

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
  return (
    <GymSiteShell slug={site.slug} gymName={site.catalog.tenant.name}>
      {children}
    </GymSiteShell>
  );
}
