'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { AdminGrid } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { SessionDatosPanel } from '@/components/SessionDatosPanel';
import { SessionRosterPanel } from '@/components/SessionRosterPanel';
import { SessionWaitlistPanel } from '@/components/SessionWaitlistPanel';
import type { SessionDetail } from '@/lib/api/sessions';

/**
 * Detalle de sesión (fallback / deep link): datos, roster y waitlist.
 *
 * @remarks Desde el listado se pueden abrir los paneles en modal.
 */
export default function SesionDetailPage() {
  return (
    <RequireStaff>
      <DetailInner />
    </RequireStaff>
  );
}

function DetailInner() {
  const params = useParams();
  const sessionId = String(params.id);
  const [title, setTitle] = useState('Sesión');
  const [listsKey, setListsKey] = useState(0);

  function onSessionSaved(session: SessionDetail) {
    setTitle(session.serviceName);
    setListsKey((k) => k + 1);
  }

  return (
    <AdminShell
      title={title}
      actions={
        <Link href="/sesiones" className="btn ghost">
          Volver
        </Link>
      }
    >
      <AdminGrid>
        <SessionDatosPanel
          sessionId={sessionId}
          onSaved={onSessionSaved}
        />
        <SessionRosterPanel key={`roster-${listsKey}`} sessionId={sessionId} />
        <SessionWaitlistPanel
          key={`waitlist-${listsKey}`}
          sessionId={sessionId}
        />
      </AdminGrid>
    </AdminShell>
  );
}
