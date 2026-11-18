import type { Metadata } from 'next';
import Link from 'next/link';
import { AdSlot } from '@/components/ads/AdSlot';
import { DashboardHome } from './dashboard-home';
import { requestTenantSlug } from '@/lib/gym-site';

export const metadata: Metadata = { title: 'Inicio', robots: { index: false, follow: false } };

export default async function DashboardPage() {
  const slug = await requestTenantSlug();
  return <>
    <DashboardHome />
    {slug === 'admin' ? <p className="mkt-inner mkt-section"><Link href="/dashboard/ads">Administrar Faciliter Ads</Link></p> : slug ? <AdSlot tenantSlug={slug} placement="DASHBOARD" /> : null}
  </>;
}
