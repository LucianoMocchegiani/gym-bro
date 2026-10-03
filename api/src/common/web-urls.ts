import type { ConfigService } from '@nestjs/config';

const DEFAULT_WEB_BASE_URL = 'http://localhost:3002';

/** Origin del sitio web apex (`PUBLIC_WEB_BASE_URL`), sin barra final. */
export function publicWebOrigin(config: ConfigService): string {
  return new URL(
    config.get<string>('PUBLIC_WEB_BASE_URL')?.trim() || DEFAULT_WEB_BASE_URL,
  ).origin;
}

/** Origin web de un gym: `https://{slug}.{dominio}`. */
export function tenantWebOrigin(config: ConfigService, slug: string): string {
  const base = new URL(publicWebOrigin(config));
  base.hostname = `${slug}.${base.hostname.replace(/^www\./, '')}`;
  return base.origin;
}
