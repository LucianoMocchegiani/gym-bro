import type { Metadata } from 'next';
import Link from 'next/link';
import { DocsChrome } from '@/components/marketing/DocsChrome';
import { DOCS_PAGES } from '@/lib/docs/guide';
import { publicSiteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Guía de uso',
  description:
    'Cómo usar Faciliter Brain: panel del local, app del socio, cobros y puerta. Se va refinando con capturas reales.',
  alternates: { canonical: `${publicSiteUrl()}/docs` },
};

/**
 * Índice público de la guía de uso (landing).
 */
export default function DocsIndexPage() {
  return (
    <DocsChrome>
      <p className="eyebrow">Documentación</p>
      <h1>Guía de uso</h1>
      <p className="muted">
        Para dueño y staff del local. El socio no lee esto: lo vive en la app.
        Publicamos lo que ya está; las pantallas que faltan se van sumando.
      </p>
      <p>
        Fuera de esta guía: Super Admin, rutinas, notificaciones, tienda de
        productos físicos y noticias del local.
      </p>
      <ul className="mkt-docs-cards">
        {DOCS_PAGES.map((page) => (
          <li key={page.slug}>
            <Link href={`/docs/${page.slug}`}>
              <strong>{page.title}</strong>
              <span>{page.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </DocsChrome>
  );
}
