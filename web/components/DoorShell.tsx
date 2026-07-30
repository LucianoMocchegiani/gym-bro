'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';

/**
 * Shell del flujo puerta (nav Admin + tabs Verificar / Pase manual).
 */
export function DoorShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AdminShell
      title={title}
      actions={
        <nav className="page-tabs" aria-label="Secciones de puerta">
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
        </nav>
      }
    >
      {children}
    </AdminShell>
  );
}
