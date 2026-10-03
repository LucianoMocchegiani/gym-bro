'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminModal } from '@/components/AdminModal';

const SEEN_PREFIX = 'faciliter.planLimitedPopup.';

/**
 * Banner bajo el topbar + aviso una vez por pestaña cuando el gym está limitado.
 */
export function PlanLimitedNotice({
  tenantId,
}: {
  tenantId: string | null;
}) {
  const pathname = usePathname();
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    if (!tenantId || typeof window === 'undefined') {
      return;
    }
    const key = `${SEEN_PREFIX}${tenantId}`;
    if (sessionStorage.getItem(key)) {
      return;
    }
    sessionStorage.setItem(key, '1');
    setPopupOpen(true);
  }, [tenantId]);

  return (
    <>
      <div className="app-plan-banner" role="status">
        Las funciones están limitadas hasta que renueves el plan Faciliter.
        {pathname !== '/dashboard/plan' ? (
          <>
            {' '}
            <Link href="/dashboard/plan">Ir a Plan / Uso</Link>
          </>
        ) : null}
      </div>
      <AdminModal
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        title="Plan Faciliter vencido"
        description="Pasaron más de 3 días sin un plan vigente. Podés entrar, pero no operar el gym hasta renovar."
        footer={
          <div className="admin-modal-actions">
            <Link
              href="/dashboard/plan"
              className="btn primary"
              onClick={() => setPopupOpen(false)}
            >
              Renovar plan
            </Link>
            <button
              type="button"
              className="btn"
              onClick={() => setPopupOpen(false)}
            >
              Entendido
            </button>
          </div>
        }
      >
        <p className="muted small">
          Solo están habilitados Plan / Uso y tu cuenta.
        </p>
      </AdminModal>
    </>
  );
}
