import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { LandingPage } from '@/components/marketing/LandingPage';
import { extractTenantSlugFromHost } from '@/lib/tenant-host';
import { publicSiteUrl } from '@/lib/site-url';
import { DashboardHome } from './dashboard-home';

const LANDING_TITLE = 'Faciliter — gyms, clubes y estudios';
const LANDING_DESCRIPTION =
  'Faciliter Brain: sistema de afiliaciones para gyms, clubes y estudios. Cobros en línea y en efectivo, app del socio, puerta y asistente.';

/**
 * Apex de plataforma → landing. Host con slug de gym → dashboard Staff.
 */
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  if (extractTenantSlugFromHost(host)) {
    return {
      title: 'Inicio',
      robots: { index: false, follow: false },
    };
  }

  const site = publicSiteUrl();
  return {
    title: { absolute: LANDING_TITLE },
    description: LANDING_DESCRIPTION,
    keywords: [
      'software gimnasio',
      'software club',
      'software estudio',
      'software membresías Argentina',
      'control de acceso QR',
    ],
    openGraph: {
      type: 'website',
      locale: 'es_AR',
      url: site,
      siteName: 'Faciliter',
      title: LANDING_TITLE,
      description: LANDING_DESCRIPTION,
    },
    twitter: {
      card: 'summary',
      title: LANDING_TITLE,
      description: LANDING_DESCRIPTION,
    },
    alternates: { canonical: site },
    robots: { index: true, follow: true },
  };
}

export default async function RootPage() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  if (!extractTenantSlugFromHost(host)) {
    return <LandingPage />;
  }
  return <DashboardHome />;
}
