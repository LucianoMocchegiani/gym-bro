import Link from 'next/link';
import type { ReactNode } from 'react';
import { NavIconFaciliterMark } from '@/components/AdminNavIcons';
import { AssistantLauncher } from '@/components/assistant/AssistantDrawer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MktShell } from '@/components/marketing/MktShell';
import { MARKETING_MAIL } from '@/lib/site-url';

type MarketingShellProps = {
  children: ReactNode;
};

/**
 * Header + footer públicos, contenedor ancho (patrón Kuatia MarketingShell).
 */
export function MarketingShell({ children }: MarketingShellProps) {
  const mailHref = `mailto:${MARKETING_MAIL}?subject=${encodeURIComponent('Agendar reunión Faciliter')}`;

  return (
    <div className="mkt">
      <div className="mkt-atmosphere" aria-hidden="true" />
      <div
        className="mkt-front"
        style={{
          paddingLeft: 'max(2.5rem, 6vw)',
          paddingRight: 'max(2.5rem, 6vw)',
        }}
      >
        <MktShell as="header" className="mkt-header">
          <Link href="/" className="mkt-brand">
            <span className="brand-mark" aria-hidden="true">
              <NavIconFaciliterMark />
            </span>
            Faciliter
          </Link>
          <nav className="mkt-nav-links" aria-label="Secciones">
            <Link href="/#producto">Producto</Link>
            <Link href="/#asistente">Asistente</Link>
            <Link href="/#precio">Precio</Link>
          </nav>
          <div className="mkt-header-actions">
            <ThemeToggle />
          </div>
        </MktShell>
        {children}
        <footer className="mkt-footer">
          <MktShell className="mkt-footer-grid">
            <div className="mkt-footer-brand">
              <p className="mkt-footer-name">Faciliter</p>
              <p>
                Faciliter Brain: afiliados, cobros, acceso y agenda para gyms,
                clubes y estudios.
              </p>
            </div>
            <div>
              <p className="mkt-footer-label">Producto</p>
              <ul>
                <li>
                  <Link href="/#producto">Qué incluye</Link>
                </li>
                <li>
                  <Link href="/#asistente">Asistente</Link>
                </li>
                <li>
                  <Link href="/#precio">Precio</Link>
                </li>
                <li>
                  <Link href="/login">Acceder</Link>
                </li>
              </ul>
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
            <div>
              <p className="mkt-footer-label">Contacto</p>
              <ul>
                <li>
                  <a href={mailHref}>{MARKETING_MAIL}</a>
                </li>
              </ul>
            </div>
          </MktShell>
          <p className="mkt-copy">© {new Date().getFullYear()} Faciliter</p>
        </footer>
      </div>
      <AssistantLauncher variant="public" />
    </div>
  );
}
