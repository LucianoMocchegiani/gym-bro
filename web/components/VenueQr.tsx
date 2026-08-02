'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * QR del local para modo afiliado escanea gym (stub-venue).
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
    return <p className="muted">Generando QR…</p>;
  }

  return (
    <div className="venue-qr">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt={`QR del local: ${token}`} width={size} height={size} />
      <p className="muted small venue-qr-token">
        <code>{token}</code>
      </p>
    </div>
  );
}
