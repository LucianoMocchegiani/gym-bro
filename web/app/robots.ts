import type { MetadataRoute } from 'next';
import { publicSiteUrl } from '@/lib/site-url';

/**
 * robots.txt del apex. El panel Staff/Super se marca noindex por host/ruta.
 */
export default function robots(): MetadataRoute.Robots {
  const site = publicSiteUrl();
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/legal/', '/docs', '/docs/'],
      disallow: [
        '/login',
        '/super/',
        '/caja',
        '/afiliados',
        '/packs',
        '/servicios',
        '/sesiones',
        '/roles',
        '/staff',
        '/config',
        '/devoluciones',
        '/reportes',
        '/puerta',
      ],
    },
    sitemap: `${site}/sitemap.xml`,
  };
}
