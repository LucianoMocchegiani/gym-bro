'use client';

import { Panel } from '@/components/AdminUi';
import { IdentityPlanActions } from '@/components/IdentityPlanActions';
import type { GymPlanView } from '@/lib/api/plan';
import { MARKETING_MAIL } from '@/lib/site-url';

function dateLabel(date: string | null): string {
  if (!date) return 'Sin fecha de vencimiento';
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(
    new Date(date),
  );
}

function statusLabel(plan: GymPlanView): string {
  switch (plan.status) {
    case 'trial':
      return 'Prueba';
    case 'active':
      return 'Activo';
    case 'expired':
      return 'Vencido';
    case 'none':
      return 'Sin plan';
  }
}

/**
 * Plan Faciliter del gym (mismo layout pensado para apex más adelante).
 *
 * @remarks Contratado en faciliter.xyz → débito MP de `admin` (RN-PAG-017).
 * Alta por plataforma → Caja de `admin`.
 */
export function PlanPanel({
  plan,
  showIdentityActions = true,
}: {
  plan: GymPlanView;
  showIdentityActions?: boolean;
}) {
  return (
    <Panel title="Plan Faciliter" description={plan.tenantName}>
      <dl className="admin-definition-list">
        <div>
          <dt>Estado</dt>
          <dd>{statusLabel(plan)}</dd>
        </div>
        <div>
          <dt>Pack</dt>
          <dd>{plan.packName ?? '—'}</dd>
        </div>
        {plan.serviceNames.length ? (
          <div>
            <dt>Servicios</dt>
            <dd>{plan.serviceNames.join(', ')}</dd>
          </div>
        ) : null}
        {plan.isPlatformTrial ? (
          <div>
            <dt>Modalidad</dt>
            <dd>Prueba de plataforma</dd>
          </div>
        ) : null}
        <div>
          <dt>Inicio</dt>
          <dd>{dateLabel(plan.startsAt)}</dd>
        </div>
        <div>
          <dt>Vencimiento</dt>
          <dd>{dateLabel(plan.endsAt)}</dd>
        </div>
      </dl>
      {plan.status === 'none' ? (
        <p className="muted small">
          Para activar un plan, escribinos a{' '}
          <a href={`mailto:${MARKETING_MAIL}`}>{MARKETING_MAIL}</a>.
        </p>
      ) : null}
      {showIdentityActions && plan.isOwner ? (
        <IdentityPlanActions plan={plan} />
      ) : null}
      <p className="muted small" style={{ marginTop: '2rem' }}>
        Para cambiar de plan, escribinos a{' '}
        <a href={`mailto:${MARKETING_MAIL}`}>{MARKETING_MAIL}</a>.
      </p>
    </Panel>
  );
}
