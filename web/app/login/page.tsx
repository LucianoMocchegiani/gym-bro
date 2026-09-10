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
export default async function LoginPage() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const slug = extractTenantSlugFromHost(host);
  return <LoginClient slug={slug} />;
}
