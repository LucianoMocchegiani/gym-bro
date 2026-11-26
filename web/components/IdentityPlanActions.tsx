'use client';

import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { GymPlanView } from '@/lib/api/plan';
import {
  cancelIdentityPlanDebit,
  finalizeIdentityPlan,
  getIdentityPlanActions,
  type IdentityPlanActionsView,
} from '@/lib/api/identity-platform';

function formatWhen(iso: string | null): string {
  return iso
    ? new Date(iso).toLocaleDateString('es-AR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : 'el vencimiento actual';
}

export function IdentityPlanActions({ plan }: { plan: GymPlanView }) {
  const [state, setState] = useState<IdentityPlanActionsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<'debit' | 'finalize' | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getIdentityPlanActions(plan.tenantId)
      .then((value) => { if (!cancelled) setState(value); })
      .catch(() => { if (!cancelled) setError('No se pudieron cargar las opciones del plan.'); });
    return () => { cancelled = true; };
  }, [plan.tenantId]);

  async function run(action: 'debit' | 'finalize') {
    setBusy(true);
    setError(null);
    try {
      setState(action === 'debit'
        ? await cancelIdentityPlanDebit(plan.tenantId)
        : await finalizeIdentityPlan(plan.tenantId));
      setConfirming(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el plan.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {state?.automaticDebit === 'active' || state?.automaticDebit === 'unknown' ? (
        <button className="btn ghost" type="button" onClick={() => setConfirming('debit')}>
          Cancelar débito automático
        </button>
      ) : null}
      {state?.automaticDebit === 'cancelled' ? (
        <p className="muted small">El débito automático está cancelado.</p>
      ) : null}
      {state?.canFinalize && !state.finalizationAt ? (
        <button className="btn danger" type="button" onClick={() => setConfirming('finalize')}>
          Finalizar plan
        </button>
      ) : null}
      {state?.finalizationAt ? (
        <p className="muted small">El plan finalizará el {formatWhen(state.finalizationAt)}. El acceso se mantiene hasta esa fecha.</p>
      ) : null}
      <ConfirmDialog
        open={confirming === 'debit'}
        title="Cancelar débito automático"
        tone="danger"
        confirmLabel="Cancelar débito"
        busy={busy}
        onConfirm={() => void run('debit')}
        onCancel={() => setConfirming(null)}
        description={<>Se detendrán los próximos cobros automáticos. El plan actual y el acceso se mantienen hasta {formatWhen(plan.endsAt)}. No se hará un reintegro; un cobro que Mercado Pago ya esté procesando todavía podría acreditarse.</>}
      />
      <ConfirmDialog
        open={confirming === 'finalize'}
        title="Finalizar plan"
        tone="danger"
        confirmLabel="Finalizar plan"
        busy={busy}
        onConfirm={() => void run('finalize')}
        onCancel={() => setConfirming(null)}
        description={<>El plan finalizará el {formatWhen(plan.endsAt)} y el acceso se mantendrá hasta entonces. También se cancelará el débito automático para evitar próximos cobros. No se hará un reintegro; un cobro que Mercado Pago ya esté procesando todavía podría acreditarse.</>}
      />
    </>
  );
}
