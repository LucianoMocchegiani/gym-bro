'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { AdminGrid } from '@/components/AdminUi';
import { MemberAccountPanel } from '@/components/MemberAccountPanel';
import { MemberFichaPanel } from '@/components/MemberFichaPanel';
import { RequireStaff } from '@/components/RequireStaff';

/**
 * Ficha completa del afiliado (fallback / deep link).
 *
 * @remarks Desde el listado se abren Ficha y Cuenta en modal.
 */
export default function AfiliadoDetailPage() {
  return (
    <RequireStaff>
      <DetailInner />
    </RequireStaff>
  );
}

function DetailInner() {
  const params = useParams();
  const memberId = String(params.id);

  return (
    <AdminShell
      title="Afiliado"
      actions={
        <Link href="/afiliados" className="btn ghost">
          Volver
        </Link>
      }
    >
      <AdminGrid className="member-detail">
        <MemberFichaPanel memberId={memberId} />
        <MemberAccountPanel memberId={memberId} />
      </AdminGrid>
    </AdminShell>
  );
}
