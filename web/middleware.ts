import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { extractTenantSlugFromHost } from '@/lib/tenant-host';

function isPublicMarketingPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/legal') ||
    pathname.startsWith('/docs') ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt'
  );
}

/**
 * Middleware: noindex del panel + redirect de la sesión al host correcto.
 *
 * @remarks La sesión vive en `localStorage` (por origen), así que este middleware
 * no puede leerla. Solo marca noindex y redirige por **pathname**: si alguien
 * pide una ruta de plataforma desde un host que no corresponde, lo manda a su
 * subdominio. La reconciliación real host↔sesión la hace `RequireStaff` en el
 * cliente (ver `lib/auth/AuthProvider.tsx`), que sí tiene la sesión.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const slug = extractTenantSlugFromHost(host);
  const pathname = request.nextUrl.pathname;

  const response = NextResponse.next();
  if (slug || !isPublicMarketingPath(pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|og-stack.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
