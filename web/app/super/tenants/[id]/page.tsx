'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { RequireSuper } from '@/components/RequireSuper';
import { SuperShell } from '@/components/SuperShell';
import { TenantEditPanel } from '@/components/TenantEditPanel';

/**
 * Detalle de tenant (fallback / deep link). La edición también abre modal
 * desde el listado (`?editar=<id>`).
 */
export default function TenantDetailPage() {
  return (
    <RequireSuper>
      <DetailInner />
    </RequireSuper>
  );
}

function DetailInner() {
  const params = useParams();
  const tenantId = String(params.id);

  return (
    <SuperShell
      title="Editar tenant"
      actions={
        <Link href="/super/tenants" className="btn ghost">
          Volver
        </Link>
      }
    >
      <TenantEditPanel tenantId={tenantId} />
    </SuperShell>
  );
}