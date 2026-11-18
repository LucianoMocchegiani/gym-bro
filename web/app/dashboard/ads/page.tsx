import { notFound } from 'next/navigation';
import { AdsAdmin } from '@/components/ads/AdsAdmin';
import { requestTenantSlug } from '@/lib/gym-site';

export default async function AdsAdminPage() {
  if ((await requestTenantSlug()) !== 'admin') notFound();
  return <AdsAdmin />;
}
