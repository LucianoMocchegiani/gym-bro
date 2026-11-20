import { headers } from 'next/headers';
import { ImageResponse } from 'next/og';
import { fetchPublicTenantCatalog } from '@/lib/api/public-tenant-catalog';
import { extractTenantSlugFromHost } from '@/lib/tenant-host';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default async function Icon() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? '';
  const slug = extractTenantSlugFromHost(host);
  const catalog = slug ? await fetchPublicTenantCatalog(slug) : null;
  const icon = catalog?.site?.brandIcon;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0a',
      }}
    >
      {icon ? (
        <img
          src={icon}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : (
        <svg width="32" height="32" viewBox="0 0 24 24">
          <g fill="none" stroke="#a3e635" strokeWidth="1.75" strokeLinecap="round">
            <path d="M10.4 8.2 7.8 15.1M13.6 8.2l2.6 6.9M8.7 17h6.6" />
          </g>
          <g fill="#a3e635">
            <circle cx="12" cy="6.5" r="2.4" />
            <circle cx="6.5" cy="17" r="2.4" />
            <circle cx="17.5" cy="17" r="2.4" />
          </g>
        </svg>
      )}
    </div>,
    size,
  );
}
