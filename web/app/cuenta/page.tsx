import { notFound, redirect } from 'next/navigation';
import { resolveGymSite, requestTenantSlug } from '@/lib/gym-site';
import { IdentityAccountPage } from '@/components/IdentityAccountPage';
import { GymAccountPage } from '@/components/gym-site/GymAccountPage';
import { GymSiteShell } from '@/components/gym-site/GymSiteShell';

export const metadata = {
  title: 'Cuenta',
  robots: { index: false, follow: false },
};

/**
 * Apex: cuenta Faciliter con sus gyms. Gym: cuenta de quien entró (datos,
 * contraseña, cerrar sesión); el portal del socio vive en `/portal`.
 *
 * @remarks Las vueltas de Mercado Pago viejas (`?compra=` / `?alta=`) se
 * reenvían a `/portal` con el mismo query.
 */
export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await requestTenantSlug())) {
    return <IdentityAccountPage />;
  }
  const query = await searchParams;
  if (query.compra || query.alta) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') {
        params.set(key, value);
      }
    }
    redirect(`/portal?${params.toString()}`);
  }
  const site = await resolveGymSite();
  if (!site) {
    notFound();
  }
  return (
    <GymSiteShell slug={site.slug} gymName={site.catalog.tenant.name}>
      <GymAccountPage slug={site.slug} />
    </GymSiteShell>
  );
}
