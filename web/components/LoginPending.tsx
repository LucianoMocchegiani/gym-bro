'use client';

import { ThemeToggle } from '@/components/ThemeToggle';
import { siteBrandStyle } from '@/lib/site-theme';

/**
 * Placeholder de login mientras se lee sesión o cookie del proxy.
 */
export function LoginPending({
  message,
  brand = 'Faciliter',
  brandColor,
}: {
  message: string;
  brand?: string;
  brandColor?: string;
}) {
  return (
    <div
      className={`login-page${brandColor ? ' gym-site-branded' : ''}`}
      style={brandColor ? siteBrandStyle(brandColor) : undefined}
    >
      <div className="login-theme-slot">
        <ThemeToggle />
      </div>
      <div className="login-card">
        <p className="brand">{brand}</p>
        <p className="muted">{message}</p>
      </div>
    </div>
  );
}
