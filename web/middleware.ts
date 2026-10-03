import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  extractTenantSlugFromHost,
  platformOrigin,
  PLATFORM_TENANT_SLUG,
} from '@/lib/tenant-host';

/** Rutas del panel que antes vivían en la raíz del host del gym. */
const LEGACY_PANEL_SEGMENTS = new Set([
  'afiliados',
  'arqueo',
  'auditoria',
  'avisos',
  'caja',
  'config',
  'devoluciones',
  'gastos',
  'packs',
  'plan',
  'puerta',
  'reportes',
  'roles',
  'servicios',
  'sesiones',
  'staff',
  'tenants',
  'vencimientos',
]);

function isPublicMarketingPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/legal') ||
    pathname.startsWith('/docs') ||
    pathname === '/cuenta/eliminar' ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt'
  );
}

/** Origin público (detrás del proxy `nextUrl` trae el host interno). */
function publicOrigin(request: NextRequest): string {
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  const proto =
    request.headers.get('x-forwarded-proto') ??
    request.nextUrl.protocol.replace(':', '');
  return `${proto}://${host}`;
}

/**
 * Middleware: rutas viejas del panel → `/dashboard`, raíz de `admin` → apex y
 * noindex de todo lo que no es público.
 *
 * @remarks La sesión vive en `localStorage` (por origen), así que este middleware
 * no puede leerla. La reconciliación host↔sesión la hace `RequireStaff` en el
 * cliente. En el host de un gym solo su landing (`/`) se indexa.
 */
export function middleware(request: NextRequest) {
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  const slug = extractTenantSlugFromHost(host);
  const { pathname, search } = request.nextUrl;

  const firstSegment = pathname.split('/')[1] ?? '';
  if (LEGACY_PANEL_SEGMENTS.has(firstSegment)) {
    return NextResponse.redirect(
      new URL(`/dashboard${pathname}${search}`, publicOrigin(request)),
      308,
    );
  }

  if (slug === PLATFORM_TENANT_SLUG && pathname === '/') {
    return NextResponse.redirect(new URL('/', platformOrigin()), 308);
  }

  const response = NextResponse.next();
  const indexable = slug ? pathname === '/' : isPublicMarketingPath(pathname);
  if (!indexable) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|opengraph-image|twitter-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
