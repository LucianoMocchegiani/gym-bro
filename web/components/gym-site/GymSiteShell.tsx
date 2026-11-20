import Link from 'next/link';
import type { ReactNode } from 'react';
import { GymHeaderActions } from '@/components/gym-site/GymHeaderActions';
import { MarketingFrame } from '@/components/marketing/MarketingFrame';
import { MktShell } from '@/components/marketing/MktShell';
import type { SiteSocialLinks } from '@/lib/api/tenant-site';
import { platformOrigin } from '@/lib/tenant-host';

const SOCIALS = [
  ['facebook', 'Facebook'],
  ['x', 'X'],
  ['tiktok', 'TikTok'],
  ['instagram', 'Instagram'],
  ['whatsapp', 'WhatsApp'],
] as const satisfies ReadonlyArray<readonly [keyof SiteSocialLinks, string]>;

/**
 * Header + footer de la web pública de un gym (`{slug}/`, `/comprar`, `/portal`, `/cuenta`).
 * El header ocupa todo el ancho, como el topbar del panel, para que tema y
 * avatar no salten de lugar al pasar del panel a la web.
 */
export function GymSiteShell({
  slug,
  gymName,
  children,
  brandColor,
  brandIcon,
  socialLinks,
}: {
  slug: string;
  gymName: string;
  children: ReactNode;
  brandColor?: string;
  brandIcon?: string | null;
  socialLinks?: SiteSocialLinks;
}) {
  const configuredSocials = SOCIALS.flatMap(([key, label]) =>
    socialLinks?.[key] ? [{ key, label, href: socialLinks[key]! }] : [],
  );
  return (
    <MarketingFrame brandColor={brandColor}>
      <header className="mkt-header mkt-header-bar">
        <Link href="/" className="mkt-brand">
          <span
            className="brand-mark"
            aria-hidden="true"
            style={brandIcon ? { border: 'none' } : undefined}
          >
            {brandIcon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brandIcon}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              gymName.trim().slice(0, 1).toUpperCase()
            )}
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
          {configuredSocials.length > 0 ? (
            <div>
              <p className="mkt-footer-label">Redes sociales</p>
              <ul className="mkt-social-links">
                {configuredSocials.map(({ key, label, href }) => (
                  <li key={key}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${label} (se abre en una pestaña nueva)`}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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
