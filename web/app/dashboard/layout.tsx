import type { CSSProperties, ReactNode } from 'react';
import { fetchPublicTenantCatalog } from '@/lib/api/public-tenant-catalog';
import { SITE_DEFAULT_PRIMARY_COLOR } from '@/lib/api/tenant-site';
import { requestTenantSlug } from '@/lib/gym-site';
import { siteBrandStyle } from '@/lib/site-theme';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const slug = await requestTenantSlug();
  if (!slug || slug === 'admin') {
    return children;
  }
  const catalog = await fetchPublicTenantCatalog(slug);
  const color = catalog?.site?.themeColor ?? SITE_DEFAULT_PRIMARY_COLOR;
  return (
    <div className="gym-site-branded" style={siteBrandStyle(color) as CSSProperties}>
      {children}
    </div>
  );
}
