import type { ReactNode } from 'react';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MktShell } from '@/components/marketing/MktShell';
import { DocsNav } from '@/components/marketing/DocsNav';

type DocsShellProps = {
  current?: string;
  children: ReactNode;
};

/**
 * Layout de `/docs`: shell de marketing + índice de la guía.
 */
export function DocsChrome({ current, children }: DocsShellProps) {
  return (
    <MarketingShell>
      <MktShell as="div" className="mkt-docs">
        <DocsNav current={current} />
        <div className="mkt-docs-main">{children}</div>
      </MktShell>
    </MarketingShell>
  );
}
