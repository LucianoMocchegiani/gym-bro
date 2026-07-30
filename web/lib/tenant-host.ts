/**
 * Extracción de slug de tenant desde el Host del browser.
 */

const RESERVED_HOST_LABELS = new Set([
  'www',
  'app',
  'api',
  'super',
  'admin',
  'localhost',
  'mail',
  'cdn',
]);

/**
 * Obtiene el slug desde `demo.localhost:3000` → `demo`.
 * Apex `localhost` / `127.0.0.1` → null.
 */
export function extractTenantSlugFromHost(host: string): string | null {
  const hostname = host.split(':')[0]?.toLowerCase() ?? '';
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }
  const match = /^([a-z0-9-]+)\.localhost$/.exec(hostname);
  if (!match) {
    // Prod futuro: slug.gymbro.app
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const slug = parts[0];
      if (slug && !RESERVED_HOST_LABELS.has(slug)) {
        return slug;
      }
    }
    return null;
  }
  const slug = match[1];
  if (!slug || RESERVED_HOST_LABELS.has(slug)) {
    return null;
  }
  return slug;
}

/**
 * URL absoluta al apex de la app (sin slug), p. ej. Super Admin.
 */
export function platformOrigin(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000';
  }
  const { protocol, port } = window.location;
  const portPart = port ? `:${port}` : '';
  return `${protocol}//localhost${portPart}`;
}

/**
 * URL del Admin de un tenant por slug (dev: slug.localhost).
 */
export function tenantOrigin(slug: string): string {
  if (typeof window === 'undefined') {
    return `http://${slug}.localhost:3000`;
  }
  const { protocol, port } = window.location;
  const portPart = port ? `:${port}` : '';
  return `${protocol}//${slug}.localhost${portPart}`;
}
