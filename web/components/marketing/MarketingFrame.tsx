import type { CSSProperties, ReactNode } from 'react';
import { siteBrandStyle } from '@/lib/site-theme';

/**
 * Fondo y márgenes de las páginas públicas (landing Faciliter y web del gym).
 */
export function MarketingFrame({
  children,
  overlay,
  brandColor,
}: {
  children: ReactNode;
  /** Fuera del contenedor con márgenes (p. ej. burbuja flotante). */
  overlay?: ReactNode;
  /** Aplica solo a la página pública principal del gimnasio. */
  brandColor?: string;
}) {
  return (
    <div
      className={`mkt${brandColor ? ' gym-site-branded' : ''}`}
      style={brandColor ? (siteBrandStyle(brandColor) as CSSProperties) : undefined}
    >
      <div className="mkt-atmosphere" aria-hidden="true" />
      <div
        className="mkt-front"
        style={{
          paddingLeft: 'max(2.5rem, 6vw)',
          paddingRight: 'max(2.5rem, 6vw)',
        }}
      >
        {children}
      </div>
      {overlay}
    </div>
  );
}
