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

const SOCIAL_ICONS: Record<keyof SiteSocialLinks, ReactNode> = {
  facebook: (
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.019 4.388 11.005 10.125 11.854v-8.385H7.078v-3.469h3.047V9.429c0-3.021 1.792-4.69 4.533-4.69 1.312 0 2.686.236 2.686.236v2.953h-1.513c-1.491 0-1.956.931-1.956 1.887v2.258h3.328l-.532 3.469h-2.796v8.385C19.612 23.078 24 18.092 24 12.073Z" />
  ),
  x: (
    <path d="M18.901 1.153h3.68l-8.04 9.19 9.46 12.504h-7.406l-5.8-7.584-6.637 7.584H.476l8.6-9.83L0 1.153h7.594l5.243 6.932zm-1.291 19.49h2.039L6.482 3.24H4.294z" />
  ),
  tiktok: (
    <path d="M12.53 0h4.3c.2 3.3 2.1 5.7 5.2 6.1v4.3c-1.9.1-3.8-.5-5.3-1.6v8.5c0 4.3-3.5 6.8-7.5 6.6-3.1-.2-6.1-2.5-6.5-5.9-.7-5 3.4-8.8 8.3-8.1v4.5c-2-.6-4.2.2-4 2.6.2 2.1 3.8 2.9 5.1 1.3.4-.5.4-1.3.4-2V0Z" />
  ),
  instagram: (
    <>
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="12"
        cy="12"
        r="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="17.5" cy="6.5" r="1" />
    </>
  ),
  whatsapp: (
    <>
      <path
        d="M20.5 11.8a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.3-4.7a8.5 8.5 0 1 1 16.2-4Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="M8 8.2c.2-.5.5-.5.8-.5h.5c.2 0 .4.1.5.4l.8 1.9c.1.2.1.4-.1.6l-.6.7c-.2.2-.2.4-.1.6.6 1 1.4 1.8 2.4 2.3.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.8.9c.3.1.4.3.4.5 0 .3-.2 1.1-.7 1.5-.5.5-1.2.7-1.9.6-1-.1-2.4-.7-3.9-2-1.3-1.2-2.2-2.7-2.5-3.7-.3-1 .1-2 .7-2.8Z" />
    </>
  ),
};

function SocialIcon({ platform }: { platform: keyof SiteSocialLinks }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }}
    >
      {SOCIAL_ICONS[platform]}
    </svg>
  );
}

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
  contactEmail,
}: {
  slug: string;
  gymName: string;
  children: ReactNode;
  brandColor?: string;
  brandIcon?: string | null;
  socialLinks?: SiteSocialLinks;
  contactEmail?: string | null;
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
              Web construida con{' '}
              <a href={platformOrigin()}>Faciliter</a>.
            </p>
          </div>
          {contactEmail ? (
            <div>
              <p className="mkt-footer-label">Contacto</p>
              <a
                href={`mailto:${contactEmail}`}
                aria-label={`Enviar email a ${contactEmail}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <svg
                  aria-hidden="true"
                  focusable="false"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }}
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                {contactEmail}
              </a>
            </div>
          ) : null}
          {configuredSocials.length > 0 ? (
            <div>
              <p className="mkt-footer-label">Redes sociales</p>
              <ul
                className="mkt-social-links"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '0.75rem 1rem',
                }}
              >
                {configuredSocials.map(({ key, label, href }) => (
                  <li key={key}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${label} (se abre en una pestaña nueva)`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        textDecoration: 'none',
                      }}
                    >
                      <SocialIcon platform={key} />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </MktShell>
        <p className="mkt-copy">© {new Date().getFullYear()} {gymName}</p>
      </footer>
    </MarketingFrame>
  );
}
