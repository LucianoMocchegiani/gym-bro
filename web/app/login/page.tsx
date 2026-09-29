import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { extractTenantSlugFromHost } from '@/lib/tenant-host';
import { LoginClient } from './LoginClient';

export const metadata: Metadata = {
  title: 'Acceder',
  robots: { index: false, follow: false },
};

/**
 * Login Staff del panel Admin.
 *
 * @remarks El tenant se deduce del header Host (`demo.localhost:3002`)
 * en el servidor, para que SSR y cliente rendericen el mismo árbol.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ handoff?: string; next?: string; pack?: string }>;
}) {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const slug = extractTenantSlugFromHost(host);
  const query = await searchParams;
  const nextPath = safeNextPath(query.next, query.pack);
  return (
    <LoginClient
      slug={slug}
      consumeHandoff={query.handoff === '1'}
      nextPath={nextPath}
    />
  );
}

function safeNextPath(next?: string, pack?: string): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }
  if (pack && /^[0-9a-f-]{36}$/i.test(pack)) {
    return `/empezar?pack=${encodeURIComponent(pack)}`;
  }
  return '/cuenta';
}
