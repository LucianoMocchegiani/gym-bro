import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { extractTenantSlugFromHost } from '@/lib/tenant-host';

/**
 * En hosts de tenant (`demo.localhost`), redirige `/super/*` al apex.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const slug = extractTenantSlugFromHost(host);
  if (!slug || !request.nextUrl.pathname.startsWith('/super')) {
    return NextResponse.next();
  }
  const apex = request.nextUrl.clone();
  apex.hostname = 'localhost';
  return NextResponse.redirect(apex);
}

export const config = {
  matcher: ['/super/:path*'],
};
