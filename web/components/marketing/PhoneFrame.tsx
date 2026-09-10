import type { ReactNode } from 'react';

/**
 * Marco de teléfono para el mock de la app (mismo patrón que Kuatia).
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mkt-phone">
      <div className="mkt-phone-glow" aria-hidden="true" />
      <div className="mkt-phone-bezel">
        <div className="mkt-phone-speaker" aria-hidden="true" />
        <div className="mkt-phone-screen">{children}</div>
      </div>
    </div>
  );
}
