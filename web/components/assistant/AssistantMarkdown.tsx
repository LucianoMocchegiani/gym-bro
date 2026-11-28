'use client';

import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { isSafeAdminHref } from '@/lib/chat/links';
import styles from './assistant-markdown.module.css';

export function AssistantMarkdown({
  text,
  onOpen,
  expanded = false,
}: {
  text: string;
  onOpen: (href: string) => void;
  expanded?: boolean;
}) {
  const components: Components = {
    a: ({ href, children }) =>
      href && isSafeAdminHref(href) ? (
        <button
          type="button"
          className={styles.link}
          onClick={() => onOpen(href)}
        >
          {children}
        </button>
      ) : (
        <a href={href}>{children}</a>
      ),
  };

  return (
    <div className={`${styles.markdown} ${expanded ? styles.expanded : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={components}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
