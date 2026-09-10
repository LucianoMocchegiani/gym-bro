import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  extractTenantSlugFromHost,
  platformHostname,
} from '@/lib/tenant-host';

function isPublicMarketingPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/legal') ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt'
  );
}

/**
 * En hosts de tenant, redirige `/super/*` al apex de plataforma.
 * El Admin no se indexa; la landing del apex sí.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const slug = extractTenantSlugFromHost(host);
  const pathname = request.nextUrl.pathname;

  if (slug && pathname.startsWith('/super')) {
    const apex = request.nextUrl.clone();
    const platform = platformHostname();
    apex.hostname = platform;
    if (platform !== 'localhost' && !platform.endsWith('.localhost')) {
      apex.port = '';
      apex.protocol = 'https:';
    }
    return NextResponse.redirect(apex);
  }

  const response = NextResponse.next();
  if (slug || !isPublicMarketingPath(pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
