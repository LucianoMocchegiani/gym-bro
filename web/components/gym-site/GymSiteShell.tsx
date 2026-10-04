import Link from 'next/link';
import type { ReactNode } from 'react';
import { GymHeaderActions } from '@/components/gym-site/GymHeaderActions';
import { MarketingFrame } from '@/components/marketing/MarketingFrame';
import { MktShell } from '@/components/marketing/MktShell';
import { platformOrigin } from '@/lib/tenant-host';

/**
 * Header + footer de la web pública de un gym (`{slug}/`, `/comprar`, `/portal`, `/cuenta`).
 * El header ocupa todo el ancho, como el topbar del panel, para que tema y
 * avatar no salten de lugar al pasar del panel a la web.
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
      <header className="mkt-header mkt-header-bar">
        <Link href="/" className="mkt-brand">
          <span className="brand-mark" aria-hidden="true">
            {gymName.trim().slice(0, 1).toUpperCase()}
          </span>
          {gymName}
        </Link>
        <nav className="mkt-nav-links" aria-label="Secciones">
          <Link href="/#planes">Planes</Link>
        </nav>
        <GymHeaderActions slug={slug} />
      </header>
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
