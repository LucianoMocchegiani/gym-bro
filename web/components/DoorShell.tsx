'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';

/**
 * Cabecera mínima del flujo puerta (kiosk staff).
 */
export function DoorShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { session, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="door-shell">
      <header className="door-header">
        <div>
          <p className="brand">GymBro</p>
          <h1>{title}</h1>
        </div>
        <div className="door-header-meta">
          <span className="muted">
            {session?.name ?? session?.email}
          </span>
          <nav className="door-nav">
            <Link
              href="/puerta"
              className={pathname === '/puerta' ? 'active' : undefined}
            >
              Verificar
            </Link>
            <Link
              href="/puerta/pase-manual"
              className={
                pathname === '/puerta/pase-manual' ? 'active' : undefined
              }
            >
              Pase manual
            </Link>
            <button type="button" className="linkish" onClick={() => void logout()}>
              Salir
            </button>
          </nav>
        </div>
      </header>
      <main className="door-main">{children}</main>
    </div>
  );
}
