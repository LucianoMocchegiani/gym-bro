'use client';

import { Panel } from '@/components/AdminUi';
import type { GymPlanView } from '@/lib/api/plan';
import { MARKETING_MAIL } from '@/lib/site-url';

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
 * @remarks Contratado en faciliter.xyz → débito MP de `admin` (RN-PAG-017).
 * Alta por plataforma → Caja de `admin`. Cambio de plan y baja del débito
 * todavía no son self-serve: se piden a Faciliter.
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
          Prueba hasta el {formatWhen(plan.endsAt)}. Si contrataste en
          faciliter.xyz, al terminar Mercado Pago cobra el primer mes con el
          débito que autorizaste. Si te dio de alta Faciliter, el mes se paga
          con Faciliter.
        </p>
      ) : null}
      {plan.status === 'active' ? (
        <p className="muted small">
          Si contrataste en faciliter.xyz, se renueva solo con el débito de
          Mercado Pago. Si no, se renueva pagando con Faciliter.
        </p>
      ) : null}
      {plan.status === 'none' || plan.status === 'expired' ? (
        <p className="muted small">
          Sin plan vigente: hay 3 días de gracia y después el gym queda
          limitado (solo Plan / Uso). Para renovar, escribinos a{' '}
          <a href={`mailto:${MARKETING_MAIL}`}>{MARKETING_MAIL}</a>.
        </p>
      ) : null}
      <p className="muted small">
        Para cambiar de plan o dar de baja el débito, escribinos a{' '}
        <a href={`mailto:${MARKETING_MAIL}`}>{MARKETING_MAIL}</a>.{' '}
        {plan.isOwner ? 'Sos el dueño de este gym.' : null}
      </p>
    </Panel>
  );
}
