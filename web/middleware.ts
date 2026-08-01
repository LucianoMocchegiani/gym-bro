import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  extractTenantSlugFromHost,
  platformHostname,
} from '@/lib/tenant-host';

/**
 * En hosts de tenant, redirige `/super/*` al apex de plataforma.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const slug = extractTenantSlugFromHost(host);
  if (!slug || !request.nextUrl.pathname.startsWith('/super')) {
    return NextResponse.next();
  }
  const apex = request.nextUrl.clone();
  const platform = platformHostname();
  apex.hostname = platform;
  if (platform !== 'localhost' && !platform.endsWith('.localhost')) {
    apex.port = '';
    apex.protocol = 'https:';
  }
  return NextResponse.redirect(apex);
}

export const config = {
  matcher: ['/super/:path*'],
};
