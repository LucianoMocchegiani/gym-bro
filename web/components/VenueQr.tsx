'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { presentationWalletLink } from '@/lib/kuatia-wallet';
import { VenueQrSkeleton } from './VenueQrSkeleton';

/** QR de puerta, envuelto para Kuatia Wallet web. */
export function VenueQr({
  token,
  size = 280,
}: {
  token: string;
  size?: number;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [walletLink, setWalletLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const link = presentationWalletLink(token);
        const url = await QRCode.toDataURL(link, {
          width: size,
          margin: 2,
          color: { dark: '#0a0a0a', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
        if (!cancelled) {
          setDataUrl(url);
          setWalletLink(link);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError('No se pudo generar el QR de Kuatia Wallet');
          setDataUrl(null);
          setWalletLink(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, size]);

  if (error) {
    return <p className="error">{error}</p>;
  }
  if (!dataUrl || !walletLink) {
    return <VenueQrSkeleton size={size} />;
  }

  return (
    <div className="venue-qr">
      <Image
        src={dataUrl}
        alt="QR para abrir la solicitud en Kuatia Wallet"
        width={size}
        height={size}
        unoptimized
      />
      <p className="muted small">Escaneá con la cámara o enviá el link a tu teléfono.</p>
      <div className="admin-actions">
        <a className="btn ghost" href={walletLink} target="_blank" rel="noreferrer">
          Abrir Kuatia Wallet
        </a>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            void navigator.clipboard
              .writeText(walletLink)
              .then(() => setCopyStatus('Link copiado.'))
              .catch(() => setCopyStatus('No se pudo copiar el link.'));
          }}
        >
          Copiar link
        </button>
      </div>
      {copyStatus ? <p className="muted small" role="status">{copyStatus}</p> : null}
    </div>
  );
}
