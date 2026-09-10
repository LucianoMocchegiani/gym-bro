import Link from 'next/link';
import { DOCS_PAGES } from '@/lib/docs/guide';

/**
 * Índice de la guía pública (chips, no lista markdown).
 */
export function DocsNav({ current }: { current?: string }) {
  return (
    <nav className="mkt-docs-nav" aria-label="Guía de uso">
      <p className="mkt-docs-nav-label">Guía</p>
      <div className="mkt-docs-nav-links">
        <Link href="/docs" className={!current ? 'is-on' : undefined}>
          Índice
        </Link>
        {DOCS_PAGES.map((page) => (
          <Link
            key={page.slug}
            href={`/docs/${page.slug}`}
            className={current === page.slug ? 'is-on' : undefined}
          >
            {page.title}
          </Link>
        ))}
      </div>
    </nav>
  );
}
