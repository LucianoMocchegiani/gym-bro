'use client';

import { useCallback, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MpCardPaymentBrick } from '@/components/MpCardPaymentBrick';
import type { MpCardTokenResult } from '@/components/MpCardPaymentBrick';
import { Panel } from '@/components/AdminUi';
import { SkeletonPanel } from '@/components/Skeleton';
import { ApiClientError, newIdempotencyKey } from '@/lib/api/client';
import {
  cancelDebitMandate,
  chargeDebitMandateNow,
  enrollDebitMandate,
  getMemberDebitView,
  getMpPublicKey,
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
 * Pestaña Débitos de Caja: cola + panel del afiliado (CU-PAG-010).
 */
export function CajaDebitPanel({
  memberId,
  onNeedReceipt,
}: {
  memberId: string;
  onNeedReceipt: (transactionId: string) => void;
}) {
  const [bucket, setBucket] = useState<Bucket>('due');
  const [queue, setQueue] = useState<DebitMandateDetail[]>([]);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queueLoading, setQueueLoading] = useState(true);

  const [view, setView] = useState<MemberDebitView | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [nextPackId, setNextPackId] = useState('');

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
    void getMpPublicKey()
      .then((r) => setPublicKey(r.publicKey))
      .catch(() => setPublicKey(null));
  }, []);

  const monthlyPacks = packs.filter((p) => p.billingPeriod === 'MONTHLY');
  const mandate = view?.mandate ?? null;
  const authorizePackId =
    nextPackId || view?.currentMonthly?.packId || monthlyPacks[0]?.id || '';
  const authorizeAmount =
    monthlyPacks.find((p) => p.id === authorizePackId)?.price ??
    view?.mandate?.packPrice ??
    1000;

  async function refreshAll() {
    await Promise.all([loadQueue(), loadView()]);
  }

  async function onAuthorize(token: MpCardTokenResult) {
    if (!memberId || !authorizePackId) {
      setError('Elegí afiliado y pack MONTHLY');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await enrollDebitMandate(memberId, {
        packId: authorizePackId,
        cardToken: token.token,
        paymentMethodId: token.paymentMethodId,
        issuerId: token.issuerId,
        installments: token.installments,
        identificationType: token.identificationType,
        identificationNumber: token.identificationNumber,
        chargeNow: false,
        idempotencyKey: newIdempotencyKey('debit-auth'),
      });
      setMessage('Tarjeta autorizada. El débito corre el día de vencimiento.');
      await refreshAll();
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo autorizar la tarjeta';
      setError(message);
      throw new Error(message);
    } finally {
      setBusy(false);
    }
  }

  async function onChargeNow() {
    if (!mandate) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await chargeDebitMandateNow(mandate.id);
      setMessage('Cobro enviado.');
      if (result.transactionId) {
        onNeedReceipt(result.transactionId);
      }
      await refreshAll();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'No se pudo cobrar',
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
      await updateDebitMandatePack(mandate.id, nextPackId);
      setMessage('Próximo débito actualizado.');
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

  return (
    <div className="cash-layout">
      <Panel title="Cola" description="A debitar, reintentos y fallidos.">
        <div className="cash-tabs" role="tablist">
          {(
            [
              ['due', 'Hoy / vencidos'],
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
                    {row.packName} · vence {row.nextChargeOn} · {row.status}
                    {row.attemptCount > 0 ? ` (${row.attemptCount}/3)` : ''}
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
            ? 'Estado del mandato, cobrar ahora o autorizar tarjeta.'
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
              {mandate.cardLastFour ? ` · ****${mandate.cardLastFour}` : ''}
            </p>
            <p className="muted small">
              Próximo cobro: {mandate.nextChargeOn} · {formatMoney(mandate.packPrice)}
            </p>
            {mandate.lastError ? (
              <p className="error small">{mandate.lastError}</p>
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
              <button
                type="button"
                className="btn primary"
                disabled={busy}
                onClick={() => void onChargeNow()}
              >
                Cobrar ahora
              </button>
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
          <div>
            <p className="small">
              Pack vigente: {view.currentMonthly.packName} (vence{' '}
              {new Date(view.currentMonthly.endsAt).toLocaleDateString('es-AR')}
              ). Autorizá una tarjeta; no se cobra ahora.
            </p>
            {publicKey && authorizePackId ? (
              <MpCardPaymentBrick
                publicKey={publicKey}
                amount={authorizeAmount}
                onToken={onAuthorize}
              />
            ) : (
              <p className="muted small">
                Conectá Mercado Pago en Config para tokenizar la tarjeta.
              </p>
            )}
          </div>
        ) : null}

        {memberId && !viewLoading && !mandate && !view?.currentMonthly ? (
          <p className="muted small">
            Sin mandato y sin pack MONTHLY vigente. Cobra un MONTHLY con
            Mercado Pago y tildá débito en la pestaña Cobro.
          </p>
        ) : null}
      </Panel>

      <ConfirmDialog
        open={confirmCancel}
        title="Dar de baja el débito"
        description="No se volverá a cobrar solo. El mes ya pagado sigue hasta su vencimiento."
        confirmLabel="Dar de baja"
        tone="danger"
        busy={busy}
        onConfirm={() => void onCancel()}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
