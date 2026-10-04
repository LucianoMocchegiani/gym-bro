import type { MetadataRoute } from 'next';
import { publicSiteUrl } from '@/lib/site-url';

/**
 * robots.txt (mismo para el apex y los gyms). El panel vive bajo `/dashboard`;
 * además se marca noindex por host/ruta en el middleware.
 */
export default function robots(): MetadataRoute.Robots {
  const site = publicSiteUrl();
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/legal/', '/docs', '/docs/', '/cuenta/eliminar'],
      disallow: ['/login', '/dashboard', '/cuenta', '/portal', '/comprar'],
    },
    sitemap: `${site}/sitemap.xml`,
  };
}
