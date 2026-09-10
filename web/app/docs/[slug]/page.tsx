import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsArticle } from '@/components/marketing/DocsArticle';
import { DocsChrome } from '@/components/marketing/DocsChrome';
import { DOCS_PAGES, loadGuidePage, type DocsSlug } from '@/lib/docs/guide';
import { publicSiteUrl } from '@/lib/site-url';

type DocsSlugPageProps = {
  params: Promise<{ slug: string }>;
};

function isDocsSlug(value: string): value is DocsSlug {
  return DOCS_PAGES.some((page) => page.slug === value);
}

export function generateStaticParams(): { slug: DocsSlug }[] {
  return DOCS_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: DocsSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = DOCS_PAGES.find((item) => item.slug === slug);
  if (!page) {
    return { title: 'Guía de uso' };
  }
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `${publicSiteUrl()}/docs/${page.slug}` },
  };
}

/**
 * Capítulo de la guía pública.
 */
export default async function DocsSlugPage({ params }: DocsSlugPageProps) {
  const { slug } = await params;
  if (!isDocsSlug(slug)) {
    notFound();
  }
  const { meta, blocks } = loadGuidePage(slug);
  return (
    <DocsChrome current={slug}>
      <p className="eyebrow">Guía de uso</p>
      <h1>{meta.title}</h1>
      <p className="muted">{meta.description}</p>
      <DocsArticle blocks={blocks} />
    </DocsChrome>
  );
}
