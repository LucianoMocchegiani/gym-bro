'use client';

import { useCallback, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SkeletonForm } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import {
  listMemberCredentialOffers,
  type CredentialOfferItem,
} from '@/lib/api/credential-offers';
import { getMember, type MemberDetail } from '@/lib/api/members';
import { reissueCredentialOffer } from '@/lib/api/contracts';

/**
 * Panel de credencial SSI del afiliado para molinete (OID4VCI).
 *
 * @remarks Reemisión desde el contrato activo.
 */
export function MemberCredentialPanel({
  memberId,
}: {
  memberId: string;
}) {
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [offer, setOffer] = useState<CredentialOfferItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerOk, setOfferOk] = useState<string | null>(null);
  const [offerBusy, setOfferBusy] = useState(false);
  const [confirmReissue, setConfirmReissue] = useState(false);

  const loadOffer = useCallback(async () => {
    try {
      const result = await listMemberCredentialOffers(memberId, {
        pageSize: 1,
        order: 'desc',
      });
      setOffer(result.items[0] ?? null);
      setOfferError(null);
    } catch (err) {
      setOffer(null);
      setOfferError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cargar la credencial',
      );
    }
  }, [memberId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const m = await getMember(memberId);
        if (cancelled) return;
        setMember(m);
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar el afiliado',
        );
      }
    })();
    return () => { cancelled = true; };
  }, [memberId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await loadOffer();
    })();
    return () => { cancelled = true; };
  }, [loadOffer]);

  async function onReissue() {
    if (!offer) return;
    setOfferBusy(true);
    setOfferError(null);
    setOfferOk(null);
    try {
      const idempotencyKey = `reissue-${memberId}-${Date.now()}`;
      await reissueCredentialOffer(memberId, {
        packId: offer.packId,
        idempotencyKey,
      });
      await loadOffer();
      setOfferOk('Credencial re-emitida.');
    } catch (err) {
      setOfferError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo re-emitir la credencial',
      );
    } finally {
      setOfferBusy(false);
    }
  }

  if (loadError) return <p className="error">{loadError}</p>;
  if (!member) return <SkeletonForm fields={2} />;

  const active = member.status === 'ACTIVE';

  return (
    <div className="admin-stack">
      <p className="muted small">
        {member.email}
        {!active ? ` · ${member.status}` : ''}
      </p>
      <p className="muted small">
        VC de vínculo afiliado → puerta OID4VP. La credencial se emite al
        contratar un pack.
      </p>

      {offer ? (
        <ul className="plain-list">
          <li>
            Pack: <strong>{offer.packName}</strong>
          </li>
          <li>
            Estado: <strong>{offer.status}</strong>
            {' · '}
            {new Date(offer.createdAt).toLocaleString('es-AR')}
          </li>
          {offer.lastError ? (
            <li className="error">Error: {offer.lastError}</li>
          ) : null}
        </ul>
      ) : (
        <p className="muted">Sin offer todavía.</p>
      )}

      {offerError ? <p className="error">{offerError}</p> : null}
      {offerOk ? <p className="ok-msg">{offerOk}</p> : null}

      <button
        type="button"
        className="primary"
        disabled={offerBusy || !active || !offer}
        onClick={() => setConfirmReissue(true)}
      >
        {offerBusy
          ? 'Re-emitiendo…'
          : offer
            ? 'Re-emitir credencial'
            : 'Emitir credencial'}
      </button>

      <ConfirmDialog
        open={confirmReissue}
        title="Re-emitir credencial"
        description="Se generará un nuevo offer OID4VCI para la wallet del afiliado."
        confirmLabel="Re-emitir"
        busy={offerBusy}
        onConfirm={() => { setConfirmReissue(false); void onReissue(); }}
        onCancel={() => setConfirmReissue(false)}
      />
    </div>
  );
}
