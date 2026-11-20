'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminModal } from '@/components/AdminModal';
import { getGymPlan } from '@/lib/api/plan';
import { shouldShowFreePlanNotice } from '@/lib/free-plan-notice';

const SEEN_PREFIX = 'faciliter.freePlanNotice.';

/** Aviso promocional para gyms sin contrato activo; las restricciones son informativas. */
export function FreePlanNotice({
  tenantId,
  canManagePlan,
}: {
  tenantId: string | null;
  canManagePlan: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!tenantId || !canManagePlan) {
      return;
    }
    let cancelled = false;
    void getGymPlan()
      .then((plan) => {
        if (
          cancelled ||
          (plan.status !== 'none' && plan.status !== 'expired')
        ) {
          return;
        }
        const key = `${SEEN_PREFIX}${tenantId}`;
        const now = Date.now();
        try {
          if (!shouldShowFreePlanNotice(localStorage.getItem(key), now)) {
            return;
          }
          localStorage.setItem(key, String(now));
        } catch {
          // Si el navegador bloquea el almacenamiento, mostrar el aviso igualmente.
        }
        if (!cancelled) {
          setOpen(true);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [tenantId, canManagePlan]);

  return (
    <AdminModal
      open={open}
      onClose={() => setOpen(false)}
      title="Con Faciliter Free, empezás sin costo"
      description="Estas son las condiciones previstas para el plan Free:"
      size="wide"
      footer={
        <div className="admin-modal-actions">
          <Link
            href="/dashboard/plan"
            className="btn primary"
            onClick={() => setOpen(false)}
          >
            Ver Plan / Uso
          </Link>
          <button type="button" className="btn" onClick={() => setOpen(false)}>
            Ahora no
          </button>
        </div>
      }
    >
      <ul className="plain-list">
        <li>Chats con IA limitados.</li>
        <li>Soporte y prioridad de atención limitados.</li>
        <li>Hasta 100 afiliaciones.</li>
        <li>
          Publicidad de Faciliter en la web pública, Mi portal y el panel de
          administración.
        </li>
      </ul>
      <p className="muted small">
        Algunas de estas condiciones todavía no están aplicadas técnicamente y
        se revisarán por separado.
      </p>
    </AdminModal>
  );
}
