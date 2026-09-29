import { headers } from 'next/headers';
import { extractTenantSlugFromHost } from '@/lib/tenant-host';
import { IdentityAccountPage } from '@/components/IdentityAccountPage';
import { StaffCuentaPage } from '@/components/StaffCuentaPage';

export const metadata = {
  title: 'Cuenta',
  robots: { index: false, follow: false },
};

/**
 * Apex: gyms de la Identity. Slug de gym: cuenta staff.
 */
export default async function CuentaPage() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  if (!extractTenantSlugFromHost(host)) {
    return <IdentityAccountPage />;
  }
  return <StaffCuentaPage />;
}
