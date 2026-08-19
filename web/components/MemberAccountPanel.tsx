'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Panel } from '@/components/AdminUi';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SkeletonPanel } from '@/components/Skeleton';
import { ReceiptPanel } from '@/components/ReceiptPanel';
import { ApiClientError } from '@/lib/api/client';
import {
  cancelContract,
  reissueCredentialOffer,
} from '@/lib/api/contracts';
import type { ContractDetail } from '@/lib/api/contracts';
import { listMemberCredentialOffers } from '@/lib/api/credential-offers';
import type { CredentialOfferItem } from '@/lib/api/credential-offers';
import { getMemberAccount } from '@/lib/api/members';
import type { MemberAccountDetail } from '@/lib/api/members';
import {
  getReceiptByPayment,
  listMemberReceipts,
} from '@/lib/api/receipts';
import type { ReceiptDetail } from '@/lib/api/receipts';
import { formatMoney } from '@/lib/cash-labels';

/**
 * Estado de cuenta del afiliado (CU-AFI-004): contratos, pagos, offers, comprobantes.
 */
export function MemberAccountPanel({
  memberId,
  embedded = false,
}: {
  memberId: string;
  /** Sin Panel/título duplicado (p. ej. dentro de AdminModal). */
  embedded?: boolean;
}) {
  const [account, setAccount] = useState<MemberAccountDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [cancelTarget, setCancelTarget] = useState<ContractDetail | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelOk, setCancelOk] = useState<string | null>(null);

  const [receipts, setReceipts] = useState<ReceiptDetail[]>([]);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] =
    useState<ReceiptDetail | null>(null);
  const [receiptBusyId, setReceiptBusyId] = useState<string | null>(null);

  const [offers, setOffers] = useState<CredentialOfferItem[]>([]);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [offersBusy, setOffersBusy] = useState(false);
  const [reissueBusyId, setReissueBusyId] = useState<string | null>(null);
  const [offersOk, setOffersOk] = useState<string | null>(null);
  const [copiedOfferId, setCopiedOfferId] = useState<string | null>(null);
  const [reissueTarget, setReissueTarget] =
    useState<CredentialOfferItem | null>(null);

  async function loadOffers() {
    try {
      const result = await listMemberCredentialOffers(memberId, {
        pageSize: 50,
        order: 'desc',
      });
      setOffers(result.items);
      setOffersError(null);
    } catch (err) {
      setOffers([]);
      setOffersError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudieron cargar credential offers',
      );
    }
  }

  async function reloadAccount() {
    const acc = await getMemberAccount(memberId);
    setAccount(acc);
    setLoadError(null);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [acc, receiptsResult] = await Promise.all([
          getMemberAccount(memberId),
          listMemberReceipts(memberId, {
            pageSize: 20,
            order: 'desc',
          }).catch(() => null),
        ]);
        if (cancelled) {
          return;
        }
        setAccount(acc);
        if (receiptsResult) {
          setReceipts(receiptsResult.items);
          setReceiptsError(null);
        } else {
          setReceipts([]);
          setReceiptsError('No se pudieron cargar comprobantes');
        }
        setLoadError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar el estado de cuenta',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setOffersBusy(true);
      try {
        const result = await listMemberCredentialOffers(memberId, {
          pageSize: 50,
          order: 'desc',
        });
        if (cancelled) {
          return;
        }
        setOffers(result.items);
        setOffersError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setOffers([]);
        setOffersError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudieron cargar credential offers',
        );
      } finally {
        if (!cancelled) {
          setOffersBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  async function openReceiptForPayment(paymentId: string) {
    setReceiptBusyId(paymentId);
    try {
      const r = await getReceiptByPayment(paymentId);
      setSelectedReceipt(r);
      setReceiptsError(null);
    } catch (err) {
      setSelectedReceipt(null);
      setReceiptsError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cargar el comprobante',
      );
    } finally {
      setReceiptBusyId(null);
    }
  }

  function openCancel(contract: ContractDetail) {
    setCancelTarget(contract);
    setCancelReason('');
    setCancelConfirmOpen(false);
    setCancelError(null);
    setCancelOk(null);
  }

  function closeCancel() {
    setCancelTarget(null);
    setCancelReason('');
    setCancelConfirmOpen(false);
    setCancelError(null);
  }

  async function onCancelContract(e: FormEvent) {
    e.preventDefault();
    if (!cancelTarget) {
      return;
    }
    setCancelConfirmOpen(true);
  }

  async function doCancelContract() {
    if (!cancelTarget) {
      return;
    }
    setCancelBusy(true);
    setCancelError(null);
    setCancelOk(null);
    try {
      await cancelContract(cancelTarget.id, cancelReason);
      setCancelOk(`Contrato «${cancelTarget.packName}» cancelado.`);
      setCancelTarget(null);
      setCancelReason('');
      await reloadAccount();
    } catch (err) {
      setCancelError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cancelar el contrato',
      );
    } finally {
      setCancelBusy(false);
    }
  }

  async function copyOfferUri(offer: CredentialOfferItem) {
    if (!offer.offerUri) {
      return;
    }
    try {
      await navigator.clipboard.writeText(offer.offerUri);
      setCopiedOfferId(offer.id);
      window.setTimeout(() => setCopiedOfferId(null), 2000);
    } catch {
      setOffersError('No se pudo copiar el offer URI');
    }
  }

  async function doReissue() {
    const offer = reissueTarget;
    if (!offer) {
      return;
    }
    const contract = account?.contracts.find((c) => c.id === offer.contractId);
    const key = contract?.payment.idempotencyKey;
    if (!contract || !key) {
      setOffersError(
        'No se encontró la idempotencyKey del contrato para re-emitir',
      );
      setReissueTarget(null);
      return;
    }
    setReissueBusyId(offer.id);
    setOffersError(null);
    setOffersOk(null);
    try {
      await reissueCredentialOffer(memberId, {
        packId: offer.packId,
        idempotencyKey: key,
      });
      setOffersOk(`Offer re-emitido para «${offer.packName}».`);
      await loadOffers();
    } catch (err) {
      setOffersError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo re-emitir el offer',
      );
    } finally {
      setReissueBusyId(null);
      setReissueTarget(null);
    }
  }

  if (loadError) {
    return <p className="error">{loadError}</p>;
  }
  if (!account) {
    return <SkeletonPanel lines={5} />;
  }

  const body = (
    <>
      <div className="stat-row">
        <div>
          <p className="muted small">Contratos activos</p>
          <p className="stat-value">{account.summary.activeContracts}</p>
        </div>
        <div>
          <p className="muted small">Acceso libre</p>
          <p className="stat-value">
            {account.summary.hasAccessLibre ? 'Sí' : 'No'}
          </p>
        </div>
        <div>
          <p className="muted small">Créditos</p>
          <p className="stat-value">{account.summary.totalCreditsRemaining}</p>
        </div>
        <div>
          <p className="muted small">Deuda</p>
          <p className="stat-value">
            {account.debt.status === 'AL_DIA'
              ? 'Al día'
              : `$${account.debt.amount}`}
          </p>
        </div>
      </div>

      <h3>Contratos</h3>
      {account.contracts.length === 0 ? (
        <p className="muted">Sin contratos.</p>
      ) : (
        <ul className="plain-list">
          {account.contracts.map((c) => (
            <li key={c.id}>
              <strong>{c.packName}</strong> — {c.status}
              {c.hasAccessLibre ? ' · libre' : ''}
              {c.creditBalances?.length
                ? ` · créditos: ${c.creditBalances
                    .map(
                      (b) =>
                        `${b.serviceName ?? b.serviceId}:${b.remaining}`,
                    )
                    .join(', ')}`
                : ''}
              {c.status === 'ACTIVE' ? (
                <>
                  {' · '}
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => openCancel(c)}
                  >
                    Cancelar
                  </button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {cancelOk ? <p className="ok-msg">{cancelOk}</p> : null}

      {cancelTarget ? (
        <form
          className="admin-form"
          onSubmit={(e) => void onCancelContract(e)}
        >
          <h3>Cancelar «{cancelTarget.packName}»</h3>
          <p className="muted small">
            Corta acceso libre y créditos. <strong>No</strong> reembolsa el pago
            (para eso usá Devolver). El motivo opcional queda en auditoría.
          </p>
          <label>
            Motivo (opcional)
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Ej. incumplimiento de normas"
            />
          </label>
          {cancelError ? <p className="error">{cancelError}</p> : null}
          <div className="form-actions">
            <button
              type="submit"
              className="btn danger"
              disabled={cancelBusy}
            >
              {cancelBusy ? 'Cancelando…' : 'Cancelar contrato'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={closeCancel}
              disabled={cancelBusy}
            >
              Cerrar
            </button>
          </div>
        </form>
      ) : null}

      <h3>Credential offers (OID4VCI)</h3>
      <p className="muted small">
        Ofertas de credencial del afiliado. Re-emitir usa la misma
        idempotencyKey del pago (`members.write`).
      </p>
      {offersBusy ? <p className="muted">Cargando offers…</p> : null}
      {offersError ? <p className="error">{offersError}</p> : null}
      {offersOk ? <p className="ok-msg">{offersOk}</p> : null}
      {!offersBusy && offers.length === 0 ? (
        <p className="muted">Sin credential offers.</p>
      ) : null}
      {offers.length > 0 ? (
        <ul className="plain-list">
          {offers.map((o) => {
            const canReissue = Boolean(
              account.contracts.find((c) => c.id === o.contractId)?.payment
                .idempotencyKey,
            );
            return (
              <li key={o.id}>
                <strong>{o.packName}</strong> — {o.status}
                {' · '}
                {new Date(o.createdAt).toLocaleString('es-AR')}
                {o.validUntil
                  ? ` · hasta ${new Date(o.validUntil).toLocaleDateString('es-AR')}`
                  : ''}
                {o.lastError ? (
                  <span className="error"> · error: {o.lastError}</span>
                ) : null}
                {o.offerUri ? (
                  <>
                    {' · '}
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => void copyOfferUri(o)}
                    >
                      {copiedOfferId === o.id ? 'URI copiado' : 'Copiar URI'}
                    </button>
                  </>
                ) : (
                  <span className="muted"> · sin URI</span>
                )}
                {canReissue ? (
                  <>
                    {' · '}
                    <button
                      type="button"
                      className="linkish"
                      disabled={reissueBusyId === o.id}
                      onClick={() => setReissueTarget(o)}
                    >
                      {reissueBusyId === o.id ? 'Re-emitiendo…' : 'Re-emitir'}
                    </button>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <h3>Próximas reservas</h3>
      {account.reservations.length === 0 ? (
        <p className="muted">Sin reservas próximas.</p>
      ) : (
        <ul className="plain-list">
          {account.reservations.map((r) => (
            <li key={r.id}>
              {r.serviceName} — {new Date(r.startsAt).toLocaleString('es-AR')} (
              {r.coverage})
            </li>
          ))}
        </ul>
      )}

      <h3>Pagos recientes</h3>
      {account.recentPayments.length === 0 ? (
        <p className="muted">Sin pagos.</p>
      ) : (
        <ul className="plain-list">
          {account.recentPayments.map((p) => (
            <li key={p.id}>
              ${p.amount} · {p.method} · {p.status} ·{' '}
              {new Date(p.createdAt).toLocaleString('es-AR')}
              {p.status === 'APPROVED' ? (
                <>
                  {' · '}
                  <button
                    type="button"
                    className="linkish"
                    disabled={receiptBusyId === p.id}
                    onClick={() => void openReceiptForPayment(p.id)}
                  >
                    {receiptBusyId === p.id ? '…' : 'Comprobante'}
                  </button>
                  {' · '}
                  <Link
                    href={`/devoluciones?paymentId=${encodeURIComponent(p.id)}`}
                  >
                    Devolver
                  </Link>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <h3>Comprobantes</h3>
      {receiptsError ? <p className="error">{receiptsError}</p> : null}
      {selectedReceipt ? (
        <ReceiptPanel
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      ) : null}
      {receipts.length === 0 ? (
        <p className="muted">Sin comprobantes emitidos.</p>
      ) : (
        <ul className="plain-list">
          {receipts.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="linkish"
                onClick={() => setSelectedReceipt(r)}
              >
                {r.code}
              </button>
              {' — '}
              {formatMoney(r.amount)} · {r.method} ·{' '}
              {new Date(r.createdAt).toLocaleString('es-AR')}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={cancelConfirmOpen}
        title={`Cancelar «${cancelTarget?.packName ?? ''}»`}
        description="Corta acceso libre y créditos. No reembolsa el pago (para eso usá Devolver). El motivo queda en auditoría."
        confirmLabel="Confirmar cancelación"
        tone="danger"
        confirmWord="CANCELAR"
        busy={cancelBusy}
        onConfirm={() => {
          setCancelConfirmOpen(false);
          void doCancelContract();
        }}
        onCancel={() => setCancelConfirmOpen(false)}
      />

      <ConfirmDialog
        open={reissueTarget !== null}
        title="Re-emitir credential offer"
        description={`¿Re-emitir credential offer de «${reissueTarget?.packName ?? ''}»? Fuerza una nueva oferta OID4VCI en Kuatia.`}
        confirmLabel="Re-emitir"
        busy={reissueBusyId !== null}
        onConfirm={() => void doReissue()}
        onCancel={() => setReissueTarget(null)}
      />
    </>
  );

  if (embedded) {
    return <div className="account-panel admin-stack">{body}</div>;
  }

  return (
    <Panel
      title="Estado de cuenta"
      description="Contratos, créditos, reservas y pagos recientes."
      className="account-panel"
    >
      {body}
    </Panel>
  );
}
