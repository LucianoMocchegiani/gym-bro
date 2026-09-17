'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SkeletonForm } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import type { ContractDetail } from '@/lib/api/contracts';
import {
  listMemberCredentialOffers,
  reissueMemberCredentialOffer,
  type CredentialOfferItem,
} from '@/lib/api/credential-offers';
import {
  getMember,
  getMemberAccount,
  type MemberDetail,
} from '@/lib/api/members';

type CurrentPackOption = {
  packId: string;
  packName: string;
  startsAt: string;
  endsAt: string | null;
};

/**
 * Packs con contrato ACTIVE que cubre hoy, un ítem por `packId`.
 *
 * @remarks El primero es el de `startsAt` más reciente (mismo default que la API).
 */
function packsCoveringToday(contracts: ContractDetail[]): CurrentPackOption[] {
  const sorted = [...contracts].sort(
    (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
  );
  const seen = new Set<string>();
  const packs: CurrentPackOption[] = [];
  for (const c of sorted) {
    if (seen.has(c.packId)) continue;
    seen.add(c.packId);
    packs.push({
      packId: c.packId,
      packName: c.packName,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
    });
  }
  return packs;
}

function formatRange(from: string, until: string | null): string {
  const start = new Date(from).toLocaleDateString('es-AR');
  if (!until) return start;
  return `${start} → ${new Date(until).toLocaleDateString('es-AR')}`;
}

/**
 * Panel de credencial SSI del afiliado para molinete (OID4VCI).
 *
 * @remarks Select de packs que cubren hoy (CU-AFI-006). Reemitir no cobra.
 */
export function MemberCredentialPanel({
  memberId,
}: {
  memberId: string;
}) {
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [packs, setPacks] = useState<CurrentPackOption[]>([]);
  const [selectedPackId, setSelectedPackId] = useState('');
  const [offers, setOffers] = useState<CredentialOfferItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerOk, setOfferOk] = useState<string | null>(null);
  const [offerBusy, setOfferBusy] = useState(false);
  const [confirmReissue, setConfirmReissue] = useState(false);

  const loadPacks = useCallback(async () => {
    const account = await getMemberAccount(memberId, { coverage: 'current' });
    const next = packsCoveringToday(account.contracts);
    setPacks(next);
    setSelectedPackId((prev) =>
      next.some((p) => p.packId === prev) ? prev : (next[0]?.packId ?? ''),
    );
  }, [memberId]);

  const loadOffers = useCallback(async () => {
    const result = await listMemberCredentialOffers(memberId, {
      pageSize: 50,
      order: 'desc',
    });
    setOffers(result.items);
  }, [memberId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const m = await getMember(memberId);
        if (cancelled) return;
        setMember(m);
        setLoadError(null);
        await Promise.all([loadPacks(), loadOffers()]);
        if (cancelled) return;
        setOfferError(null);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar el afiliado',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [memberId, loadPacks, loadOffers]);

  const selectedPack = useMemo(
    () => packs.find((p) => p.packId === selectedPackId) ?? null,
    [packs, selectedPackId],
  );
  const offer = useMemo(
    () => offers.find((item) => item.packId === selectedPackId) ?? null,
    [offers, selectedPackId],
  );

  async function onReissue() {
    if (!selectedPackId) return;
    setOfferBusy(true);
    setOfferError(null);
    setOfferOk(null);
    try {
      await reissueMemberCredentialOffer(memberId, true, selectedPackId);
      await loadOffers();
      setOfferOk(
        `Credencial re-emitida de ${selectedPack?.packName ?? 'pack'}. El socio debe Aceptar en la app.`,
      );
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
  const canIssue = active && Boolean(selectedPack);

  return (
    <div className="admin-stack">
      <p className="muted small">
        {member.email}
        {!active ? ` · ${member.status}` : ''}
      </p>
      <p className="muted small">
        VC de vínculo afiliado → puerta OID4VP. Se emite al cobrar el pack.
        Re-emitir no cobra: elegí el pack que cubre hoy.
      </p>

      {packs.length > 0 ? (
        <label>
          Pack vigente
          <select
            value={selectedPackId}
            onChange={(e) => {
              setSelectedPackId(e.target.value);
              setOfferOk(null);
              setOfferError(null);
            }}
          >
            {packs.map((p) => (
              <option key={p.packId} value={p.packId}>
                {p.packName} ({formatRange(p.startsAt, p.endsAt)})
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="muted">
          Sin contrato que cubra hoy. No hay pack para emitir.
        </p>
      )}

      {selectedPack ? (
        offer ? (
          <ul className="plain-list">
            <li>
              Pack: <strong>{offer.packName}</strong>
            </li>
            <li>
              Vigencia offer:{' '}
              <strong>{formatRange(offer.validFrom, offer.validUntil)}</strong>
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
            Sin offer de este pack. Si el contrato está al día, emití acá.
          </p>
        )
      ) : null}

      {offerError ? <p className="error">{offerError}</p> : null}
      {offerOk ? <p className="ok-msg">{offerOk}</p> : null}

      <button
        type="button"
        className="primary"
        disabled={offerBusy || !canIssue}
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
        description={
          selectedPack
            ? `Se genera un offer nuevo de «${selectedPack.packName}». No se cobra ni se crea otro contrato. El socio tiene que Aceptar en Acceso.`
            : 'Se genera un offer del pack que cubre hoy.'
        }
        confirmLabel={offer ? 'Re-emitir' : 'Emitir'}
        busy={offerBusy}
        onConfirm={() => {
          setConfirmReissue(false);
          void onReissue();
        }}
        onCancel={() => setConfirmReissue(false)}
      />
    </div>
  );
}
