import type { Metadata } from 'next';
import Link from 'next/link';
import { DashboardHome } from './dashboard-home';
import { requestTenantSlug } from '@/lib/gym-site';

export const metadata: Metadata = {
  title: 'Inicio',
  robots: { index: false, follow: false },
};

/** Inicio del panel Staff (`{slug}/dashboard`). */
export default async function DashboardPage() {
  const slug = await requestTenantSlug();
  return (
    <>
      <DashboardHome />
      {slug === 'admin' ? (
        <p className="mkt-inner mkt-section">
          <Link href="/dashboard/ads">Administrar Faciliter Ads</Link>
        </p>
      ) : null}
    </>
  );
}
