'use client';

import { useCallback, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SkeletonForm } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import {
  listMemberCredentialOffers,
  reissueMemberCredentialOffer,
  type CredentialOfferItem,
} from '@/lib/api/credential-offers';
import { getMember, type MemberDetail } from '@/lib/api/members';

/**
 * Panel de credencial SSI del afiliado para molinete (OID4VCI).
 *
 * @remarks Reemisión del contrato ACTIVE que cubre hoy. No cobra ni crea pack.
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
        pageSize: 50,
        order: 'desc',
      });
      const now = Date.now();
      const covering =
        result.items.find((item) => {
          const from = new Date(item.validFrom).getTime();
          const until = item.validUntil
            ? new Date(item.validUntil).getTime()
            : null;
          return from <= now && (until === null || until > now);
        }) ?? null;
      setOffer(covering);
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
    setOfferBusy(true);
    setOfferError(null);
    setOfferOk(null);
    try {
      await reissueMemberCredentialOffer(memberId, true);
      await loadOffer();
      setOfferOk('Credencial re-emitida del pack vigente. El socio debe Aceptar en la app.');
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
        VC de vínculo afiliado → puerta OID4VP. Se emite al cobrar el pack.
        Re-emitir no cobra: usa el contrato vigente hoy.
      </p>

      {offer ? (
        <ul className="plain-list">
          <li>
            Pack: <strong>{offer.packName}</strong>
          </li>
          <li>
            Vigencia:{' '}
            <strong>
              {new Date(offer.validFrom).toLocaleDateString('es-AR')}
              {offer.validUntil
                ? ` → ${new Date(offer.validUntil).toLocaleDateString('es-AR')}`
                : ''}
            </strong>
          </li>
          <li>
            Estado: <strong>{offer.status}</strong>
          </li>
          {offer.lastError ? (
            <li className="error">Error: {offer.lastError}</li>
          ) : null}
        </ul>
      ) : (
        <p className="muted">
          Sin offer del pack vigente. Si el socio tiene contrato al día, emití
          acá.
        </p>
      )}

      {offerError ? <p className="error">{offerError}</p> : null}
      {offerOk ? <p className="ok-msg">{offerOk}</p> : null}

      <button
        type="button"
        className="primary"
        disabled={offerBusy || !active}
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
        title={offer ? 'Re-emitir credencial' : 'Emitir credencial'}
        description="Se genera un offer nuevo del pack que cubre hoy. No se cobra ni se crea otro contrato. El socio tiene que Aceptar en Acceso."
        confirmLabel={offer ? 'Re-emitir' : 'Emitir'}
        busy={offerBusy}
        onConfirm={() => { setConfirmReissue(false); void onReissue(); }}
        onCancel={() => setConfirmReissue(false)}
      />
    </div>
  );
}
