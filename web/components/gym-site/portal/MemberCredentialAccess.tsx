'use client';

import { useEffect, useState } from 'react';
import { getMyAccessCredential } from '@/lib/api/access';
import type { MyAccessCredential } from '@/lib/api/access';
import { issueMyCredentialOffer } from '@/lib/api/credential-offers';
import { credentialOfferEndpoint } from '@/lib/kuatia-wallet';

const WALLET_ISSUE_URL = 'https://wallet.kuatia.xyz/issue';

export function MemberCredentialAccess() {
  const [credential, setCredential] = useState<MyAccessCredential | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getMyAccessCredential()
      .then((result) => {
        if (!cancelled) setCredential(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'No se pudo cargar la credencial de acceso.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      walletUrl.searchParams.set(
        'credential_offer_uri',
        credentialOfferEndpoint(offer.offerUri),
      );
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
      <h1 className="mkt-h2">
        {!loading && credential?.provider === 'ZKTECO'
          ? 'Tu acceso ZKTeco'
          : 'Tu credencial de acceso'}
      </h1>
      {loading ? <p className="muted">Cargando método de acceso…</p> : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && credential?.provider === 'ZKTECO' ? (
        <>
          <p className="muted">
            Este tenant usa ZKTeco. Presentá en el dispositivo el número vinculado a tu tarjeta o PIN.
          </p>
          {credential.credentialIds.length ? (
            <ul className="plain-list">
              {credential.credentialIds.map((id) => (
                <li key={id}><strong>{id}</strong></li>
              ))}
            </ul>
          ) : (
            <p className="muted">No tenés un número vinculado. Si el tenant no tiene asociado un DNI a tu cuenta, contactá al staff para configurar tu acceso.</p>
          )}
        </>
      ) : null}
      {!loading && credential?.provider === 'KUATIA' ? (
        <>
          <p className="muted">
            Generá la credencial de tu plan vigente y guardala en Kuatia Wallet en
            este dispositivo.
          </p>
          <button
            className="mkt-btn-primary"
            type="button"
            onClick={issueCredential}
            disabled={busy}
          >
            {busy ? 'Preparando credencial…' : 'Generar credencial y abrir Kuatia Wallet'}
          </button>
        </>
      ) : null}
    </section>
  );
}
