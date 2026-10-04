import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { GymLandingPage } from '@/components/gym-site/GymLandingPage';
import { LandingPage } from '@/components/marketing/LandingPage';
import { fetchPublicTenantCatalog } from '@/lib/api/public-tenant-catalog';
import { extractTenantSlugFromHost, tenantOrigin } from '@/lib/tenant-host';
import { publicSiteUrl } from '@/lib/site-url';

const LANDING_TITLE =
  'Faciliter | Software de afiliaciones para gyms, clubes y estudios';
const LANDING_DESCRIPTION =
  'Faciliter es el sistema de afiliaciones para gyms, clubes y estudios en Argentina: cobros en línea y en efectivo, app del socio, puerta QR y asistente.';

async function hostSlug(): Promise<string | null> {
  const h = await headers();
  return extractTenantSlugFromHost(h.get('x-forwarded-host') ?? h.get('host') ?? '');
}

/**
 * Apex de plataforma → landing Faciliter. Host con slug → web del gym.
 */
export async function generateMetadata(): Promise<Metadata> {
  const slug = await hostSlug();
  if (slug) {
    const catalog = await fetchPublicTenantCatalog(slug);
    if (!catalog) {
      return { robots: { index: false, follow: false } };
    }
    const hero = catalog.site?.hero;
    const title = `${catalog.tenant.name} | ${hero?.title ?? 'Planes y precios'}`;
    const description =
      hero?.subtitle ??
      `Planes de ${catalog.tenant.name}: elegí el tuyo${
        catalog.onlineCheckout ? ' y pagalo online' : ''
      }.`;
    const url = tenantOrigin(slug);
    return {
      title: { absolute: title },
      description,
      openGraph: {
        type: 'website',
        locale: 'es_AR',
        url,
        siteName: catalog.tenant.name,
        title,
        description,
        ...(hero?.image ? { images: [{ url: hero.image.url }] } : {}),
      },
      alternates: { canonical: url },
      robots: { index: true, follow: true },
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
      card: 'summary_large_image',
      title: LANDING_TITLE,
      description: LANDING_DESCRIPTION,
    },
    alternates: { canonical: site },
    robots: { index: true, follow: true },
  };
}

export default async function RootPage() {
  const slug = await hostSlug();
  if (!slug) {
    return <LandingPage />;
  }
  const catalog = await fetchPublicTenantCatalog(slug);
  if (!catalog) {
    notFound();
  }
  return <GymLandingPage catalog={catalog} />;
}
