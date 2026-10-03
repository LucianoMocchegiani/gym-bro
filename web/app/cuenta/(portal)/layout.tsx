import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { resolveGymSite } from '@/lib/gym-site';
import { GymSiteShell } from '@/components/gym-site/GymSiteShell';
import { MemberArea } from '@/components/gym-site/portal/MemberArea';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Secciones del portal del socio (`/cuenta/clases`, `/cuenta/carrito`, …). */
export default async function MemberPortalLayout({
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
      <MemberArea slug={site.slug}>{children}</MemberArea>
    </GymSiteShell>
  );
}
