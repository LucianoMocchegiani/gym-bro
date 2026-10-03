import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { resolveGymSite } from '@/lib/gym-site';
import { GymCheckoutClient } from './GymCheckoutClient';

export const metadata: Metadata = {
  title: 'Comprar',
  robots: { index: false, follow: false },
};

/**
 * Compra online de un pack del gym (`?pack=`). Solo en hosts de gym.
 */
export default async function ComprarPage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string }>;
}) {
  const site = await resolveGymSite();
  if (!site) {
    notFound();
  }
  const { slug, catalog } = site;
  const { pack: packId } = await searchParams;
  const pack = catalog.packs.find((p) => p.id === packId);

  if (!pack || !catalog.onlineCheckout) {
    return (
      <div className="login-page">
        <div className="login-theme-slot">
          <ThemeToggle />
        </div>
        <div className="login-card">
          <p className="brand">{catalog.tenant.name}</p>
          <h1>No disponible</h1>
          <p className="muted">
            {pack
              ? 'Este gym todavía no vende online. Contratalo en el mostrador.'
              : 'Ese plan no está a la venta.'}
          </p>
          <Link className="btn" href="/#planes">
            Ver planes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <GymCheckoutClient slug={slug} gymName={catalog.tenant.name} pack={pack} />
  );
}
