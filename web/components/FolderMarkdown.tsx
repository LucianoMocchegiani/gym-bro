'use client';

import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

/**
 * Renderiza el cuerpo de una nota (Markdown, HTML crudo sanitizado).
 *
 * @remarks RN-FOL-005. Pensado para texto de staff y, más adelante, del asistente.
 */
export function FolderMarkdown({ source }: { source: string }) {
  const text = source.trim();
  if (!text) {
    return <p className="muted">Sin contenido.</p>;
  }
  return (
    <div className="folder-md">
      <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {text}
      </Markdown>
    </div>
  );
}
