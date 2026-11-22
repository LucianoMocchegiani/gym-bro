import type { ReactNode } from 'react';
import { CajaMpDiscountControls } from './caja/mp-discount-controls';
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
  const brandStyle = siteBrandStyle(color);
  const rootTheme = Object.entries(brandStyle)
    .map(([name, value]) => `${name}: ${value}`)
    .join('; ');

  return (
    <>
      <style>{`:root {
        ${rootTheme};
        --navigation-progress-color: ${brandStyle['--site-primary']};
        --accent: color-mix(in srgb, var(--site-primary) 35%, var(--ink));
        --accent-ink: var(--site-primary-ink);
        --accent-soft: color-mix(in srgb, var(--site-primary) 16%, transparent);
        --accent-line: color-mix(in srgb, var(--site-primary) 48%, transparent);
        --ok: var(--site-primary);
        --ok-soft: color-mix(in srgb, var(--site-primary) 16%, transparent);
      }`}</style>
      <div className="gym-site-branded" style={brandStyle}>
        {/* shortcut: keep the discount controls outside Caja's large form; move them inline when Caja is refactored. */}
        <CajaMpDiscountControls />
        {children}
      </div>
    </>
  );
}
