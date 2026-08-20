'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { VenueQrSkeleton } from './VenueQrSkeleton';

/**
 * QR de puerta (OID4VP `requestUri` u otro token escaneable).
 */
export function VenueQr({
  token,
  size = 280,
}: {
  token: string;
  size?: number;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const url = await QRCode.toDataURL(token, {
          width: size,
          margin: 2,
          color: { dark: '#0a0a0a', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
        if (!cancelled) {
          setDataUrl(url);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError('No se pudo generar el QR');
          setDataUrl(null);
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
  if (!dataUrl) {
    return <VenueQrSkeleton size={size} />;
  }

  const short =
    token.length > 64 ? `${token.slice(0, 40)}…${token.slice(-12)}` : token;

  return (
    <div className="venue-qr">
      <Image
        src={dataUrl}
        alt="QR de acceso OID4VP"
        width={size}
        height={size}
        unoptimized
      />
      <p className="muted small venue-qr-token">
        <code title={token}>{short}</code>
      </p>
    </div>
  );
}
