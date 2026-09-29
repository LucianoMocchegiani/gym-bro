'use client';

import { ThemeToggle } from '@/components/ThemeToggle';

/**
 * Placeholder de login mientras se lee sesión o cookie del proxy.
 */
export function LoginPending({ message }: { message: string }) {
  return (
    <div className="login-page">
      <div className="login-theme-slot">
        <ThemeToggle />
      </div>
      <div className="login-card">
        <p className="brand">Faciliter</p>
        <p className="muted">{message}</p>
      </div>
    </div>
  );
}
