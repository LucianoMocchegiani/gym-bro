import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { extractTenantSlugFromHost } from '@/lib/tenant-host';
import { fetchPublicPlatformPacks } from '@/lib/api/public-platform';
import { EmpezarClient } from '@/components/EmpezarClient';

export const metadata = {
  title: 'Contratar',
  robots: { index: false, follow: false },
};

/**
 * Wizard self-serve: pack elegido + nombre + slug → checkout MP.
 */
export default async function EmpezarPage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string }>;
}) {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  if (extractTenantSlugFromHost(host)) {
    redirect('/');
  }
  const query = await searchParams;
  const packs = await fetchPublicPlatformPacks();
  const pack =
    packs.find((p) => p.id === query.pack) ?? packs[0] ?? null;
  return <EmpezarClient packs={packs} initialPackId={pack?.id ?? null} />;
}
