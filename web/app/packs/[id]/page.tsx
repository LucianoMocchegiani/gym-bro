'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { PackEditPanel } from '@/components/PackEditPanel';
import { RequireStaff } from '@/components/RequireStaff';

/**
 * Detalle pack (fallback / deep link).
 *
 * @remarks Desde el listado se edita en modal.
 */
export default function PackDetailPage() {
  return (
    <RequireStaff>
      <DetailInner />
    </RequireStaff>
  );
}

function DetailInner() {
  const params = useParams();
  const packId = String(params.id);

  return (
    <AdminShell
      title="Pack"
      actions={
        <Link href="/packs" className="btn ghost">
          Volver
        </Link>
      }
    >
      <Panel title="Editar pack" className="form-panel form-panel-wide">
        <PackEditPanel packId={packId} />
      </Panel>
    </AdminShell>
  );
}
