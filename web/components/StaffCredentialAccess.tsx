'use client';

import { useEffect, useState } from 'react';
import { getMyAccessCredential } from '@/lib/api/access';
import type { MyAccessCredential } from '@/lib/api/access';
import { ApiClientError } from '@/lib/api/client';
import { issueMyStaffCredentialOffer } from '@/lib/api/staff';
import { credentialOfferEndpoint } from '@/lib/kuatia-wallet';

const WALLET_ISSUE_URL = 'https://wallet.kuatia.xyz/issue';

export function StaffCredentialAccess() {
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
            cause instanceof ApiClientError
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
      {loading ? <p className="muted">Cargando método de acceso…</p> : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && credential?.provider === 'ZKTECO' ? (
        <>
          <p className="muted">
            El tenant usa ZKTeco. Presentá el número vinculado a tu usuario en
            el dispositivo.
          </p>
          {credential.credentialIds.length ? (
            <ul className="plain-list">
              {credential.credentialIds.map((id) => (
                <li key={id}>
                  <strong>{id}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              No tenés un número ZKTeco vinculado. Pedile al administrador del
              tenant que lo configure en tu ficha de staff.
            </p>
          )}
        </>
      ) : null}
      {!loading && credential?.provider === 'KUATIA' ? (
        <>
          <p className="muted">
            La credencial identifica tu vínculo con este tenant. Se guardará en
            Kuatia Wallet en este dispositivo.
          </p>
          <button
            className="primary"
            type="button"
            onClick={issueCredential}
            disabled={busy}
          >
            {busy
              ? 'Preparando credencial…'
              : 'Generar credencial y abrir Kuatia Wallet'}
          </button>
        </>
      ) : null}
    </div>
  );
}
