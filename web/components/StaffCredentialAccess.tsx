'use client';

import { useState } from 'react';
import { ApiClientError } from '@/lib/api/client';
import { issueMyStaffCredentialOffer } from '@/lib/api/staff';
import { credentialOfferEndpoint } from '@/lib/kuatia-wallet';

const WALLET_ISSUE_URL = 'https://wallet.kuatia.xyz/issue';

export function StaffCredentialAccess() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function issueCredential() {
    setBusy(true);
    setError(null);
    try {
      const offer = await issueMyStaffCredentialOffer();
      if (offer.status !== 'PENDING' || !offer.offerUri) {
        setError('No se pudo generar la credencial. Intentá nuevamente más tarde.');
        return;
      }
      const walletUrl = new URL(WALLET_ISSUE_URL);
      walletUrl.searchParams.set(
        'credential_offer_uri',
        credentialOfferEndpoint(offer.offerUri),
      );
      window.location.assign(walletUrl.toString());
    } catch (cause) {
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : 'No se pudo generar la credencial.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-stack">
      <p className="muted">
        La credencial identifica tu vínculo con este tenant. Se guardará en
        Kuatia Wallet en este dispositivo.
      </p>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="primary"
        type="button"
        onClick={issueCredential}
        disabled={busy}
      >
        {busy ? 'Preparando credencial…' : 'Generar credencial y abrir Kuatia Wallet'}
      </button>
    </div>
  );
}
