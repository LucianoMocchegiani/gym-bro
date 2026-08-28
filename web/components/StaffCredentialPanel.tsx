'use client';

import { useCallback, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SkeletonForm } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import {
  getStaff,
  issueStaffCredentialOffer,
  listStaffCredentialOffers,
} from '@/lib/api/staff';
import type {
  StaffCredentialOfferItem,
  StaffUserDetail,
} from '@/lib/api/staff';

/**
 * Emisión / reemisión de credencial SSI staff para molinete (OID4VCI).
 */
export function StaffCredentialPanel({ staffId }: { staffId: string }) {
  const [staff, setStaff] = useState<StaffUserDetail | null>(null);
  const [offer, setOffer] = useState<StaffCredentialOfferItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerOk, setOfferOk] = useState<string | null>(null);
  const [offerBusy, setOfferBusy] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState(false);

  const loadOffer = useCallback(async () => {
    try {
      const result = await listStaffCredentialOffers(staffId, {
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
          : 'No se pudo cargar la credencial de acceso',
      );
    }
  }, [staffId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await getStaff(staffId);
        if (cancelled) return;
        setStaff(s);
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar el staff',
        );
      }
    })();
    return () => { cancelled = true; };
  }, [staffId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await loadOffer();
    })();
    return () => { cancelled = true; };
  }, [loadOffer]);

  async function onIssueOffer() {
    setOfferBusy(true);
    setOfferError(null);
    setOfferOk(null);
    try {
      const issued = await issueStaffCredentialOffer(staffId, true);
      setOffer(issued);
      if (issued.status === 'FAILED') {
        setOfferError(
          issued.lastError ?? 'Kuatia no emitió el offer (soft-fail)',
        );
      } else {
        setOfferOk('Credencial emitida.');
      }
    } catch (err) {
      setOfferError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo emitir la credencial',
      );
    } finally {
      setOfferBusy(false);
    }
  }

  if (loadError) return <p className="error">{loadError}</p>;
  if (!staff) return <SkeletonForm fields={2} />;

  return (
    <div className="admin-stack">
      <p className="muted small">
        {staff.email}
        {!staff.active ? ' · inactivo' : ''}
      </p>
      <p className="muted small">
        VC de vínculo staff → puerta OID4VP. Roles se leen en DB al verificar.
      </p>

      {offer ? (
        <ul className="plain-list">
          <li>
            Estado: <strong>{offer.status}</strong>
            {' · '}
            {new Date(offer.updatedAt).toLocaleString('es-AR')}
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
        disabled={offerBusy || !staff.active}
        onClick={() => setConfirmIssue(true)}
      >
        {offerBusy
          ? 'Emitiendo…'
          : offer
            ? 'Re-emitir credencial'
            : 'Emitir credencial'}
      </button>

      <ConfirmDialog
        open={confirmIssue}
        title={offer ? 'Re-emitir credencial' : 'Emitir credencial'}
        description="Se generará un nuevo offer OID4VCI para la wallet del staff."
        confirmLabel={offer ? 'Re-emitir' : 'Emitir'}
        busy={offerBusy}
        onConfirm={() => { setConfirmIssue(false); void onIssueOffer(); }}
        onCancel={() => setConfirmIssue(false)}
      />
    </div>
  );
}
