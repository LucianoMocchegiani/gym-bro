import type { MetadataRoute } from 'next';
import { publicSiteUrl } from '@/lib/site-url';

/**
 * robots.txt del apex. El panel Staff se marca noindex por host/ruta.
 */
export default function robots(): MetadataRoute.Robots {
  const site = publicSiteUrl();
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/legal/', '/docs', '/docs/'],
      disallow: [
        '/login',
        '/caja',
        '/vencimientos',
        '/afiliados',
        '/packs',
        '/servicios',
        '/sesiones',
        '/roles',
        '/staff',
        '/config',
        '/avisos',
        '/devoluciones',
        '/reportes',
        '/puerta',
        '/tenants',
      ],
    },
    sitemap: `${site}/sitemap.xml`,
  };
}
