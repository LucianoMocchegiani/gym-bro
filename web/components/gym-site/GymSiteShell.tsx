import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GymAccountLink } from '@/components/gym-site/GymAccountLink';
import { MarketingFrame } from '@/components/marketing/MarketingFrame';
import { MktShell } from '@/components/marketing/MktShell';
import { platformOrigin } from '@/lib/tenant-host';

/**
 * Header + footer de la web pública de un gym (`{slug}/`, `/comprar`, `/cuenta`).
 */
export function GymSiteShell({
  slug,
  gymName,
  children,
}: {
  slug: string;
  gymName: string;
  children: ReactNode;
}) {
  return (
    <MarketingFrame>
      <MktShell as="header" className="mkt-header">
        <Link href="/" className="mkt-brand">
          <span className="brand-mark" aria-hidden="true">
            {gymName.trim().slice(0, 1).toUpperCase()}
          </span>
          {gymName}
        </Link>
        <nav className="mkt-nav-links" aria-label="Secciones">
          <Link href="/#planes">Planes</Link>
        </nav>
        <div className="mkt-header-actions">
          <ThemeToggle />
          <GymAccountLink slug={slug} />
        </div>
      </MktShell>
      {children}
      <footer className="mkt-footer">
        <MktShell className="mkt-footer-grid">
          <div className="mkt-footer-brand">
            <p className="mkt-footer-name">{gymName}</p>
            <p>
              Socios y pagos con{' '}
              <a href={platformOrigin()}>Faciliter</a>.
            </p>
          </div>
          <div>
            <p className="mkt-footer-label">Legal</p>
            <ul>
              <li>
                <Link href="/legal/terminos">Términos</Link>
              </li>
              <li>
                <Link href="/legal/privacidad">Privacidad</Link>
              </li>
            </ul>
          </div>
        </MktShell>
        <p className="mkt-copy">© {new Date().getFullYear()} {gymName}</p>
      </footer>
    </MarketingFrame>
  );
}
