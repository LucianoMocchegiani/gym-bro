import type { ReactNode } from 'react';

/**
 * Fondo y márgenes de las páginas públicas (landing Faciliter y web del gym).
 */
export function MarketingFrame({
  children,
  overlay,
}: {
  children: ReactNode;
  /** Fuera del contenedor con márgenes (p. ej. burbuja flotante). */
  overlay?: ReactNode;
}) {
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
        {children}
      </div>
      {overlay}
    </div>
  );
}
