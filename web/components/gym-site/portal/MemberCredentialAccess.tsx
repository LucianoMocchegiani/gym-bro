'use client';

import { useState } from 'react';
import { issueMyCredentialOffer } from '@/lib/api/credential-offers';

const WALLET_ISSUE_URL = 'https://wallet.kuatia.xyz/issue';

export function MemberCredentialAccess() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function issueCredential() {
    setBusy(true);
    setError(null);
    try {
      const offer = await issueMyCredentialOffer();
      if (offer.status !== 'PENDING' || !offer.offerUri) {
        setError(
          'No se pudo generar la credencial. Intentá nuevamente más tarde.',
        );
        return;
      }
      const walletUrl = new URL(WALLET_ISSUE_URL);
      walletUrl.searchParams.set('credential_offer_uri', offer.offerUri);
      window.location.assign(walletUrl.toString());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo generar la credencial.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="mkt-inner mkt-section"
      style={{ display: 'grid', gap: '1rem' }}
    >
      <p className="eyebrow">Acceso</p>
      <h1 className="mkt-h2">Tu credencial Kuatia</h1>
      <p className="muted">
        Generá la credencial de tu plan vigente y guardala en Kuatia Wallet en
        este dispositivo.
      </p>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="mkt-btn-primary"
        type="button"
        onClick={issueCredential}
        disabled={busy}
      >
        {busy ? 'Preparando credencial…' : 'Generar credencial y abrir Kuatia Wallet'}
      </button>
    </section>
  );
}
