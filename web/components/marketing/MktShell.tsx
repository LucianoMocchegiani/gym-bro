import type { ReactNode } from 'react';

type ShellTag = 'div' | 'section' | 'header' | 'article';

type MktShellProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  as?: ShellTag;
};

/**
 * Contenedor centrado (max-width). El margen lateral está en `.mkt-front`.
 */
export function MktShell({
  children,
  className,
  id,
  as: Tag = 'div',
}: MktShellProps) {
  return (
    <Tag id={id} className={['mkt-shell', className].filter(Boolean).join(' ')}>
      {children}
    </Tag>
  );
}
