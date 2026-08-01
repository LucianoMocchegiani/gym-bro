/**
 * Host / slug de tenant (local `*.localhost` o dominio de prueba/prod).
 *
 * @remarks
 * - `NEXT_PUBLIC_APP_DOMAIN` — base de tenants (ej. `pruebasaproduccunon.uno`).
 *   Vacío → modo local (`demo.localhost`).
 * - `NEXT_PUBLIC_PLATFORM_HOST` — apex Super sin slug (ej. `gymbro.pruebasaproduccunon.uno`
 *   o `localhost`). Si falta: `localhost` en local, o el propio `APP_DOMAIN`.
 */

const RESERVED_HOST_LABELS = new Set([
  'www',
  'app',
  'api',
  'api-gymbro',
  'super',
  'admin',
  'localhost',
  'mail',
  'cdn',
]);

function stripPort(host: string): string {
  return host.split(':')[0]?.toLowerCase() ?? '';
}

/**
 * Dominio base de tenants (sin slug), o null en modo localhost.
 */
export function appDomain(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim().toLowerCase();
  return raw || null;
}

/**
 * Hostname del apex de plataforma (Super Admin).
 */
export function platformHostname(): string {
  const fromEnv = process.env.NEXT_PUBLIC_PLATFORM_HOST?.trim().toLowerCase();
  if (fromEnv) {
    return stripPort(fromEnv);
  }
  return appDomain() ?? 'localhost';
}

/**
 * ¿Este host es el apex de plataforma (sin tenant)?
 */
export function isPlatformHost(host: string): boolean {
  const hostname = stripPort(host);
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }
  return hostname === platformHostname();
}

/**
 * Apex a partir del Host actual (saca el slug si viene en un tenant host).
 */
export function apexHostnameFromHost(host: string): string {
  const hostname = stripPort(host);
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'localhost';
  }
  if (hostname.endsWith('.localhost')) {
    return 'localhost';
  }
  if (isPlatformHost(hostname)) {
    return hostname;
  }
  const slug = extractTenantSlugFromHost(hostname);
  if (slug && hostname.startsWith(`${slug}.`)) {
    return hostname.slice(slug.length + 1);
  }
  return hostname;
}

/**
 * Obtiene el slug desde el Host.
 *
 * @example `demo.localhost` → `demo`
 * @example `demo.pruebasaproduccunon.uno` → `demo`
 * @example apex plataforma / `localhost` → `null`
 */
export function extractTenantSlugFromHost(host: string): string | null {
  const hostname = stripPort(host);
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }
  if (isPlatformHost(hostname)) {
    return null;
  }

  const localMatch = /^([a-z0-9-]+)\.localhost$/.exec(hostname);
  if (localMatch) {
    const slug = localMatch[1];
    if (!slug || RESERVED_HOST_LABELS.has(slug)) {
      return null;
    }
    return slug;
  }

  const domain = appDomain();
  if (domain && (hostname === domain || hostname.endsWith(`.${domain}`))) {
    if (hostname === domain) {
      return null;
    }
    const withoutBase = hostname.slice(0, -(domain.length + 1));
    if (!withoutBase.includes('.')) {
      if (RESERVED_HOST_LABELS.has(withoutBase)) {
        return null;
      }
      return withoutBase || null;
    }
    const first = withoutBase.split('.')[0];
    if (!first || RESERVED_HOST_LABELS.has(first)) {
      return null;
    }
    return first;
  }

  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const slug = parts[0];
    if (slug && !RESERVED_HOST_LABELS.has(slug)) {
      return slug;
    }
  }
  return null;
}

/**
 * Hostname público de un tenant (`demo.localhost` o `demo.{APP_DOMAIN}`).
 */
export function tenantHostname(slug: string, fromHost?: string): string {
  const apex = fromHost
    ? apexHostnameFromHost(fromHost)
    : (appDomain() ?? 'localhost');
  if (apex === 'localhost' || apex === '127.0.0.1') {
    return `${slug}.localhost`;
  }
  return `${slug}.${apex}`;
}

/**
 * Etiqueta corta para UI.
 */
export function tenantHostLabel(slug: string, fromHost?: string): string {
  return tenantHostname(slug, fromHost);
}

function originForHostname(hostname: string, port?: string): string {
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost');
  const protocol =
    typeof window !== 'undefined'
      ? window.location.protocol
      : isLocal
        ? 'http:'
        : 'https:';
  let portPart = '';
  if (port) {
    portPart = `:${port}`;
  } else if (isLocal) {
    if (typeof window !== 'undefined' && window.location.port) {
      portPart = `:${window.location.port}`;
    } else if (typeof window === 'undefined') {
      portPart = ':3000';
    }
  }
  return `${protocol}//${hostname}${portPart}`;
}

/**
 * URL absoluta al apex de plataforma (Super Admin).
 */
export function platformOrigin(): string {
  const host = platformHostname();
  return originForHostname(host);
}

/**
 * URL del Admin de un tenant por slug.
 */
export function tenantOrigin(slug: string, fromHost?: string): string {
  const hostHint =
    fromHost ??
    (typeof window !== 'undefined' ? window.location.host : undefined);
  return originForHostname(tenantHostname(slug, hostHint));
}
