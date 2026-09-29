'use client';

import { Panel } from '@/components/AdminUi';
import type { GymPlanView } from '@/lib/api/plan';

function formatWhen(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusLabel(plan: GymPlanView): string {
  if (plan.status === 'trial') {
    return `Prueba · hasta ${formatWhen(plan.endsAt)}`;
  }
  if (plan.status === 'active') {
    return `Vigente · hasta ${formatWhen(plan.endsAt)}`;
  }
  if (plan.status === 'expired') {
    return `Vencido · ${formatWhen(plan.endsAt)}`;
  }
  return 'Sin pack Faciliter';
}

/**
 * Plan Faciliter del gym (mismo layout pensado para apex más adelante).
 *
 * @remarks Renovar/cambiar/débito self-serve no están en este corte: el cobro
 * sigue en Caja de plataforma. Baja y alta de gym por la web, después.
 */
export function PlanPanel({ plan }: { plan: GymPlanView }) {
  return (
    <Panel
      title="Plan Faciliter"
      description={`${plan.tenantName} · ${plan.tenantSlug}.faciliter.xyz`}
    >
      <dl className="detail-dl">
        <div>
          <dt>Pack</dt>
          <dd>{plan.packName ?? 'Ninguno'}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{statusLabel(plan)}</dd>
        </div>
        {plan.serviceNames.length > 0 ? (
          <div>
            <dt>Incluye</dt>
            <dd>
              <ul className="plain-list">
                {plan.serviceNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
      </dl>
      {plan.status === 'trial' ? (
        <p className="muted small">
          Podés dar de baja antes del {formatWhen(plan.endsAt)}. El débito
          automático al terminar la prueba se suma después; hoy el mes pago se
          cobra en Caja de Faciliter.
        </p>
      ) : null}
      {plan.status === 'none' ? (
        <p className="muted small">
          El gym sigue operativo. Para contratar o dar 30 días de prueba, Caja
          del tenant admin (tilde de prueba, efectivo).
        </p>
      ) : null}
      <p className="muted small">
        Cambio de plan, renovación por débito y portal en faciliter.xyz entran
        en el siguiente corte. {plan.isOwner ? 'Sos el dueño de este gym.' : null}
      </p>
    </Panel>
  );
}
