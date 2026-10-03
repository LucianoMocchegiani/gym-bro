'use client';

import { useCallback, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Panel } from '@/components/AdminUi';
import { SkeletonPanel } from '@/components/Skeleton';
import { ApiClientError, newIdempotencyKey } from '@/lib/api/client';
import {
  cancelDebitMandate,
  enrollDebitMandate,
  getMemberDebitView,
  listDebitMandates,
  updateDebitMandatePack,
} from '@/lib/api/debit';
import type {
  DebitMandateDetail,
  MemberDebitView,
} from '@/lib/api/debit';
import { listActivePacks } from '@/lib/api/packs';
import type { PackSummary } from '@/lib/api/packs';
import { formatMoney } from '@/lib/cash-labels';

type Bucket = 'due' | 'retrying' | 'failed' | 'all';

/**
 * Pestaña Débitos de Caja: cola + link de suscripción MP (CU-PAG-010).
 */
export function CajaDebitPanel({
  memberId,
}: {
  memberId: string;
}) {
  const [bucket, setBucket] = useState<Bucket>('due');
  const [queue, setQueue] = useState<DebitMandateDetail[]>([]);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queueLoading, setQueueLoading] = useState(true);

  const [view, setView] = useState<MemberDebitView | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [nextPackId, setNextPackId] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [copyKey, setCopyKey] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await listDebitMandates({
        bucket,
        pageSize: 50,
      });
      setQueue(res.items);
      setQueueError(null);
    } catch (err) {
      setQueueError(
        err instanceof ApiClientError ? err.message : 'No se pudo cargar la cola',
      );
    } finally {
      setQueueLoading(false);
    }
  }, [bucket]);

  const loadView = useCallback(async () => {
    if (!memberId) {
      setView(null);
      return;
    }
    setViewLoading(true);
    try {
      const v = await getMemberDebitView(memberId);
      setView(v);
      setNextPackId(v.mandate?.packId ?? v.currentMonthly?.packId ?? '');
      setPayerEmail(v.mandate?.payerEmail ?? '');
      setViewError(null);
    } catch (err) {
      setViewError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cargar el débito del afiliado',
      );
    } finally {
      setViewLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    void loadView();
  }, [loadView]);

  useEffect(() => {
    void listActivePacks().then((r) => setPacks(r.items));
  }, []);

  const monthlyPacks = packs.filter((p) => p.billingPeriod === 'MONTHLY');
  const mandate = view?.mandate ?? null;
  const enrollPackId =
    nextPackId || view?.currentMonthly?.packId || monthlyPacks[0]?.id || '';

  async function refreshAll() {
    await Promise.all([loadQueue(), loadView()]);
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopyKey(url);
    } catch {
      setError('No se pudo copiar el link');
    }
  }

  async function onGenerateLink(chargeNow: boolean) {
    if (!memberId || !enrollPackId) {
      setError('Elegí afiliado y pack MONTHLY');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await enrollDebitMandate(memberId, {
        packId: enrollPackId,
        chargeNow,
        payerEmail: payerEmail.trim() || undefined,
        idempotencyKey: newIdempotencyKey('debit-enroll'),
      });
      setMessage(
        result.checkoutUrl
          ? 'Link de suscripción listo. El socio autoriza en Mercado Pago.'
          : 'Mandato creado.',
      );
      await refreshAll();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo generar el link',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onCancel() {
    if (!mandate) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await cancelDebitMandate(mandate.id);
      setConfirmCancel(false);
      setMessage('Débito dado de baja. El contrato vigente sigue.');
      await refreshAll();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'No se pudo dar de baja',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onChangePack() {
    if (!mandate || !nextPackId || nextPackId === mandate.packId) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateDebitMandatePack(
        mandate.id,
        nextPackId,
        payerEmail.trim() || undefined,
      );
      setMessage('Nuevo link para el próximo pack. El socio tiene que autorizar de nuevo.');
      await refreshAll();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cambiar el pack',
      );
    } finally {
      setBusy(false);
    }
  }

  const shareUrl = mandate?.initPoint ?? null;

  const payerField = (
    <>
      <label>
        Mail de la cuenta Mercado Pago del socio
        <input
          type="email"
          value={payerEmail}
          onChange={(e) => setPayerEmail(e.target.value)}
          placeholder="Vacío: el mail del afiliado"
        />
      </label>
      <p className="muted small">
        Solo la cuenta de MP con este mail puede autorizar el link. Si lo
        cambiás, regenerá el link.
      </p>
    </>
  );

  return (
    <div className="cash-layout">
      <Panel title="Cola" description="Pendientes de autorizar, activos y fallidos.">
        <div className="cash-tabs" role="tablist">
          {(
            [
              ['due', 'Pendiente / link'],
              ['retrying', 'Reintentando'],
              ['failed', 'Fallidos'],
              ['all', 'Todos'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={bucket === id}
              className={bucket === id ? 'active' : undefined}
              onClick={() => setBucket(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {queueError ? <p className="error">{queueError}</p> : null}
        {queueLoading ? <SkeletonPanel lines={4} /> : null}
        {!queueLoading && queue.length === 0 ? (
          <p className="muted small">Nada en esta cola.</p>
        ) : null}
        {!queueLoading && queue.length > 0 ? (
          <ul className="plain-list">
            {queue.map((row) => (
              <li key={row.id} className="catalog-row">
                <div>
                  <p className="catalog-name">
                    {row.memberName || row.memberEmail}
                  </p>
                  <p className="muted small">
                    {row.packName}
                    {row.nextChargeOn ? ` · próximo ${row.nextChargeOn}` : ''} ·{' '}
                    {row.status}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>

      <Panel
        title="Afiliado"
        description={
          memberId
            ? 'Link de suscripción Mercado Pago, baja o cambio de pack.'
            : 'Elegí un afiliado arriba.'
        }
      >
        {!memberId ? (
          <p className="muted small">Elegí el afiliado para ver el débito.</p>
        ) : null}
        {viewLoading ? <SkeletonPanel lines={5} /> : null}
        {viewError ? <p className="error">{viewError}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="ok-msg">{message}</p> : null}

        {memberId && !viewLoading && mandate ? (
          <div className="admin-form">
            <p>
              Mandato: <strong>{mandate.status}</strong>
            </p>
            <p className="muted small">
              {mandate.nextChargeOn
                ? `Próximo cobro (espejo): ${mandate.nextChargeOn} · `
                : ''}
              {formatMoney(mandate.packPrice)}
            </p>
            {mandate.lastError ? (
              <p className="error small">{mandate.lastError}</p>
            ) : null}
            {shareUrl && mandate.status === 'PENDING_CHECKOUT' ? (
              <div className="row-actions">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() =>
                    window.open(shareUrl, '_blank', 'noopener,noreferrer')
                  }
                >
                  Abrir checkout MP
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => void copyUrl(shareUrl)}
                >
                  {copyKey === shareUrl ? 'Copiado' : 'Copiar link'}
                </button>
              </div>
            ) : null}
            <label>
              Próximo pack
              <select
                value={nextPackId}
                onChange={(e) => setNextPackId(e.target.value)}
              >
                {monthlyPacks.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatMoney(p.price)})
                  </option>
                ))}
              </select>
            </label>
            {payerField}
            <div className="row-actions">
              {nextPackId && nextPackId !== mandate.packId ? (
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy}
                  onClick={() => void onChangePack()}
                >
                  Guardar pack
                </button>
              ) : null}
              {mandate.status === 'PENDING_CHECKOUT' ||
              mandate.status === 'FAILED' ? (
                <button
                  type="button"
                  className="btn primary"
                  disabled={busy}
                  onClick={() =>
                    void onGenerateLink(!view?.currentMonthly)
                  }
                >
                  Regenerar link
                </button>
              ) : null}
              <button
                type="button"
                className="btn ghost"
                disabled={busy}
                onClick={() => setConfirmCancel(true)}
              >
                Dar de baja
              </button>
            </div>
          </div>
        ) : null}

        {memberId && !viewLoading && !mandate && view?.currentMonthly ? (
          <div className="admin-form">
            <p className="small">
              Pack vigente: {view.currentMonthly.packName} (vence{' '}
              {new Date(view.currentMonthly.endsAt).toLocaleDateString('es-AR')}
              ). Generá el link; el primer cobro MP es en el vencimiento.
            </p>
            <label>
              Pack a debitar
              <select
                value={enrollPackId}
                onChange={(e) => setNextPackId(e.target.value)}
              >
                {monthlyPacks.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatMoney(p.price)})
                  </option>
                ))}
              </select>
            </label>
            {payerField}
            <button
              type="button"
              className="btn primary"
              disabled={busy || !enrollPackId}
              onClick={() => void onGenerateLink(false)}
            >
              Generar link de débito
            </button>
          </div>
        ) : null}

        {memberId && !viewLoading && !mandate && !view?.currentMonthly ? (
          <div className="admin-form">
            <p className="muted small">
              Sin pack MONTHLY vigente. El link cobra el primer mes al autorizar
              en Mercado Pago (mismo flujo que Caja con tilde débito).
            </p>
            <label>
              Pack MONTHLY
              <select
                value={enrollPackId}
                onChange={(e) => setNextPackId(e.target.value)}
              >
                {monthlyPacks.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatMoney(p.price)})
                  </option>
                ))}
              </select>
            </label>
            {payerField}
            <button
              type="button"
              className="btn primary"
              disabled={busy || !enrollPackId}
              onClick={() => void onGenerateLink(true)}
            >
              Generar link (cobrar al autorizar)
            </button>
          </div>
        ) : null}
      </Panel>

      <ConfirmDialog
        open={confirmCancel}
        title="Dar de baja el débito"
        description="Se cancela la suscripción en Mercado Pago. El mes ya pagado sigue hasta su vencimiento."
        confirmLabel="Dar de baja"
        tone="danger"
        busy={busy}
        onConfirm={() => void onCancel()}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
