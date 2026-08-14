'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AdminShell } from '@/components/AdminShell';

export type DoorTab = 'verificar' | 'pase' | 'historial';

/**
 * Interpreta `?tab=` de Puerta (default Verificar).
 */
export function parseDoorTab(raw: string | null): DoorTab {
  if (raw === 'pase' || raw === 'historial') {
    return raw;
  }
  return 'verificar';
}

function DoorTabsNav() {
  const searchParams = useSearchParams();
  const tab = parseDoorTab(searchParams.get('tab'));

  return (
    <nav className="page-tabs" aria-label="Secciones de puerta">
      <Link
        href="/puerta"
        className={tab === 'verificar' ? 'active' : undefined}
      >
        Verificar
      </Link>
      <Link
        href="/puerta?tab=pase"
        className={tab === 'pase' ? 'active' : undefined}
      >
        Pase manual
      </Link>
      <Link
        href="/puerta?tab=historial"
        className={tab === 'historial' ? 'active' : undefined}
      >
        Historial
      </Link>
    </nav>
  );
}

/**
 * Shell del flujo puerta (nav Admin + tabs Verificar / Pase / Historial).
 */
export function DoorShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AdminShell
      title={title}
      actions={
        <Suspense fallback={<nav className="page-tabs" aria-hidden />}>
          <DoorTabsNav />
        </Suspense>
      }
    >
      {children}
    </AdminShell>
  );
}
