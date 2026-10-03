'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { PageTabs } from '@/components/PageTabs';

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
    <PageTabs
      label="Secciones de puerta"
      tabs={[
        { href: '/dashboard/puerta', label: 'Verificar', active: tab === 'verificar' },
        {
          href: '/dashboard/puerta?tab=pase',
          label: 'Pase manual',
          active: tab === 'pase',
        },
        {
          href: '/dashboard/puerta?tab=historial',
          label: 'Historial',
          active: tab === 'historial',
        },
      ]}
    />
  );
}

/**
 * Shell del flujo puerta (nav Admin + tabs Verificar / Pase / Historial).
 *
 * Las tabs van como barra propia (altura fija) debajo del título para que
 * cambiar de tab no altere el tamaño del header.
 */
export function DoorShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AdminShell title={title}>
      <Suspense fallback={<nav className="page-tabs" aria-hidden />}>
        <DoorTabsNav />
      </Suspense>
      {children}
    </AdminShell>
  );
}
