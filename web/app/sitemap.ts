import type { MetadataRoute } from 'next';
import { publicSiteUrl } from '@/lib/site-url';

/**
 * Sitemap del sitio público (apex). El Admin de cada gym no se lista.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = publicSiteUrl();
  return [
    {
      url: site,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${site}/legal/terminos`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${site}/legal/privacidad`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
