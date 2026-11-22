import Link from 'next/link';
import type { ReactNode } from 'react';
import { NavIconFaciliterMark } from '@/components/AdminNavIcons';
import { AssistantLauncher } from '@/components/assistant/AssistantDrawer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MarketingFrame } from '@/components/marketing/MarketingFrame';
import { MktShell } from '@/components/marketing/MktShell';
import { MarketingAccountLink } from '@/components/marketing/MarketingAccountLink';
import { MARKETING_MAIL } from '@/lib/site-url';

type MarketingShellProps = {
  children: ReactNode;
};

type ContactIconName = 'email' | 'facebook' | 'instagram' | 'tiktok' | 'youtube';

function ContactIcon({ name }: { name: ContactIconName }) {
  const icon = {
    email: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="2" />
      </>
    ),
    facebook: (
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.019 4.388 11.005 10.125 11.854v-8.385H7.078v-3.469h3.047V9.429c0-3.021 1.792-4.69 4.533-4.69 1.312 0 2.686.236 2.686.236v2.953h-1.513c-1.491 0-1.956.931-1.956 1.887v2.258h3.328l-.532 3.469h-2.796v8.385C19.612 23.078 24 18.092 24 12.073Z" />
    ),
    instagram: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1" />
      </>
    ),
    tiktok: (
      <path d="M12.53 0h4.3c.2 3.3 2.1 5.7 5.2 6.1v4.3c-1.9.1-3.8-.5-5.3-1.6v8.5c0 4.3-3.5 6.8-7.5 6.6-3.1-.2-6.1-2.5-6.5-5.9-.7-5 3.4-8.8 8.3-8.1v4.5c-2-.6-4.2.2-4 2.6.2 2.1 3.8 2.9 5.1 1.3.4-.5.4-1.3.4-2V0Z" />
    ),
    youtube: (
      <>
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8Z" />
        <path d="m9.6 15.5 6.3-3.5-6.3-3.5Z" fill="var(--panel-bg)" />
      </>
    ),
  }[name];

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="currentColor" style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }}>
      {icon}
    </svg>
  );
}

/**
 * Header + footer públicos, contenedor ancho (patrón Kuatia MarketingShell).
 */
export function MarketingShell({ children }: MarketingShellProps) {
  const mailHref = `mailto:${MARKETING_MAIL}?subject=${encodeURIComponent('Agendar reunión Faciliter')}`;

  return (
    <MarketingFrame overlay={<AssistantLauncher variant="public" />}>
      <MktShell as="header" className="mkt-header">
        <Link href="/" className="mkt-brand">
          <span className="brand-mark" aria-hidden="true">
            <NavIconFaciliterMark />
          </span>
          Faciliter
        </Link>
        <nav className="mkt-nav-links" aria-label="Secciones">
          <Link href="/#producto">Producto</Link>
          <Link href="/docs">Guía</Link>
          <Link href="/#asistente">Asistente</Link>
          <Link href="/#precio">Precio</Link>
        </nav>
        <div className="mkt-header-actions">
          <ThemeToggle />
          <MarketingAccountLink variant="header" />
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
                <Link href="/docs">Guía de uso</Link>
              </li>
              <li>
                <Link href="/#asistente">Asistente</Link>
              </li>
              <li>
                <Link href="/#precio">Precio</Link>
              </li>
              <li>
                <MarketingAccountLink variant="footer" />
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
            <ul className="mkt-social-links" style={{ gap: '0.5rem' }}>
              <li>
                <a href={mailHref} aria-label={`Enviar correo a ${MARKETING_MAIL}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', textDecoration: 'none' }}>
                  <ContactIcon name="email" />
                  {MARKETING_MAIL}
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/faciliterapps/" target="_blank" rel="noopener noreferrer" aria-label="Instagram (se abre en una pestaña nueva)" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', textDecoration: 'none' }}>
                  <ContactIcon name="instagram" /> Instagram
                </a>
              </li>
              <li>
                <a href="https://www.facebook.com/p/Faciliter-Apps-61594787115398/" target="_blank" rel="noopener noreferrer" aria-label="Facebook (se abre en una pestaña nueva)" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', textDecoration: 'none' }}>
                  <ContactIcon name="facebook" /> Facebook
                </a>
              </li>
              <li>
                <a href="https://www.youtube.com/@Faciliter-apps" target="_blank" rel="noopener noreferrer" aria-label="YouTube (se abre en una pestaña nueva)" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', textDecoration: 'none' }}>
                  <ContactIcon name="youtube" /> YouTube
                </a>
              </li>
              <li>
                <a href="https://www.tiktok.com/@faciliterapps" target="_blank" rel="noopener noreferrer" aria-label="TikTok (se abre en una pestaña nueva)" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', textDecoration: 'none' }}>
                  <ContactIcon name="tiktok" /> TikTok
                </a>
              </li>
            </ul>
          </div>
        </MktShell>
        <p className="mkt-copy">© {new Date().getFullYear()} Faciliter</p>
      </footer>
    </MarketingFrame>
  );
}
