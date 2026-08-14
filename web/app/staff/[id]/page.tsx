'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { AdminGrid, Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { StaffCredentialPanel } from '@/components/StaffCredentialPanel';
import { StaffRolesPanel } from '@/components/StaffRolesPanel';

/**
 * Ficha staff completa (fallback / deep link).
 *
 * @remarks Desde el listado se abren Roles y Credencial en modal.
 */
export default function StaffDetailPage() {
  return (
    <RequireStaff>
      <DetailInner />
    </RequireStaff>
  );
}

function DetailInner() {
  const params = useParams();
  const staffId = String(params.id);

  return (
    <AdminShell
      title="Staff"
      actions={
        <Link href="/staff" className="btn ghost">
          Volver
        </Link>
      }
    >
      <AdminGrid>
        <Panel title="Roles asignados" className="form-panel">
          <StaffRolesPanel staffId={staffId} />
        </Panel>
        <Panel
          title="Credencial de acceso (molinete)"
          className="form-panel"
        >
          <StaffCredentialPanel staffId={staffId} />
        </Panel>
      </AdminGrid>
    </AdminShell>
  );
}
