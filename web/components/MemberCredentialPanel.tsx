'use client';

import { useCallback, useEffect, useState } from 'react';
import { SkeletonForm } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import {
  listMemberCredentialOffers,
  type CredentialOfferItem,
} from '@/lib/api/credential-offers';
import { getMember, type MemberDetail } from '@/lib/api/members';

/**
 * Panel de credencial SSI del afiliado para molinete (OID4VCI).
 *
 * @remarks Solo lectura + reemisión. La emisión inicial ocurre al contratar pack.
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
  const [copied, setCopied] = useState(false);

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

  async function copyOfferUri() {
    if (!offer?.offerUri) return;
    try {
      await navigator.clipboard.writeText(offer.offerUri);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setOfferError('No se pudo copiar el URI');
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

      {offer?.offerUri ? (
        <div className="admin-stack">
          <label>
            Offer URI
            <input readOnly value={offer.offerUri} />
          </label>
          <button
            type="button"
            className="btn ghost"
            onClick={() => void copyOfferUri()}
          >
            {copied ? 'Copiado' : 'Copiar URI'}
          </button>
        </div>
      ) : null}

      {offerError ? <p className="error">{offerError}</p> : null}
      {offerOk ? <p className="ok-msg">{offerOk}</p> : null}
    </div>
  );
}
