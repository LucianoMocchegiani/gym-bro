import type { Metadata } from 'next';
import Link from 'next/link';
import { DocsChrome } from '@/components/marketing/DocsChrome';
import { DOCS_PAGES } from '@/lib/docs/guide';
import { publicSiteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Guía de uso',
  description:
    'Guías públicas de Faciliter para configurar el tenant, operar Caja y administrar su web.',
  alternates: { canonical: `${publicSiteUrl()}/docs` },
};

/** Índice público de la guía de uso. */
export default function DocsIndexPage() {
  return (
    <DocsChrome>
      <p className="eyebrow">Documentación</p>
      <h1>Guía de uso</h1>
      <p className="muted">
        El portal web es el recorrido principal del afiliado. La app Faciliter
        sigue siendo necesaria para escanear el QR de acceso Kuatia.
      </p>
      <p>
        Configuración, cobros y administración de la web del tenant tienen guías
        independientes. Las capturas marcadas como pendientes se agregarán
        cuando estén disponibles imágenes reales.
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
