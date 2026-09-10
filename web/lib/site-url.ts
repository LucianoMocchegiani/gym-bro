import { platformHostname, platformOrigin } from '@/lib/tenant-host';

/**
 * URL pública canónica (landing + sitemap).
 *
 * @remarks `NEXT_PUBLIC_SITE_URL` (ej. `http://localhost:3002` o
 * `https://faciliter.xyz`). Si falta: localhost usa el puerto 3002 del
 * Compose; en otros hosts cae al origin del apex de plataforma.
 */
export function publicSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    return raw.replace(/\/$/, '');
  }
  const host = platformHostname();
  if (host === 'localhost' || host === '127.0.0.1') {
    return `http://${host}:3002`;
  }
  return platformOrigin();
}

export const MARKETING_MAIL = 'hola@faciliter.xyz';
