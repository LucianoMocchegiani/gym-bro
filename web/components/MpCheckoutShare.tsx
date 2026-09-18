'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { IconReceipt } from '@/components/RowActions';
import { StatusPill } from '@/components/StatusPill';

function checkoutPreview(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.host.replace(/^www\./, '');
    const tail =
      parsed.pathname.split('/').filter(Boolean).pop() ?? parsed.pathname;
    const short =
      tail.length > 12 ? `${tail.slice(0, 8)}…${tail.slice(-4)}` : tail;
    return `${host}/${short}`;
  } catch {
    return url.length > 36 ? `${url.slice(0, 32)}…` : url;
  }
}

/**
 * Link de checkout MP en Caja: QR, URL recortada, copiar/abrir y limpiar.
 *
 * @remarks No anula la preference en MP. CU-PAG-001 (staff, sin redirect).
 */
export function MpCheckoutShare({
  url,
  approved,
  copyDone,
  onCopy,
  onOpen,
  onClear,
  onReceipt,
}: {
  url: string;
  approved: boolean;
  copyDone: boolean;
  onCopy: () => void;
  onOpen: () => void;
  onClear: () => void;
  onReceipt?: () => void;
}) {
  const size = 148;
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const png = await QRCode.toDataURL(url, {
          width: size,
          margin: 1,
          color: { dark: '#0a0a0a', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
        if (!cancelled) {
          setDataUrl(png);
          setQrError(null);
        }
      } catch {
        if (!cancelled) {
          setQrError('No se pudo armar el QR');
          setDataUrl(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="mp-checkout">
      <div className="mp-checkout-head">
        <p className="cart-name">Link de pago MP</p>
        <StatusPill tone={approved ? 'ok' : 'warn'}>
          {approved ? 'Aprobado' : 'Pendiente'}
        </StatusPill>
      </div>

      <div className="mp-checkout-qr">
        {qrError ? (
          <p className="muted small">{qrError}</p>
        ) : dataUrl ? (
          <Image
            src={dataUrl}
            alt="QR del checkout Mercado Pago"
            width={size}
            height={size}
            unoptimized
          />
        ) : (
          <div
            className="venue-qr-skeleton"
            style={{ '--qr-size': `${size}px` } as CSSProperties}
            aria-label="Generando QR"
          />
        )}
      </div>

      <div className="mp-checkout-url">
        <code title={url}>{checkoutPreview(url)}</code>
        <button
          type="button"
          className="btn ghost"
          onClick={onCopy}
        >
          {copyDone ? 'Copiado' : 'Copiar'}
        </button>
      </div>

      <div className="mp-checkout-actions">
        {approved ? (
          <button type="button" className="btn primary" onClick={onReceipt}>
            <IconReceipt />
            Ver comprobante
          </button>
        ) : (
          <p className="muted small mp-checkout-wait">Esperando el pago…</p>
        )}
        <button type="button" className="btn ghost" onClick={onOpen}>
          Abrir
        </button>
        <button type="button" className="btn ghost" onClick={onClear}>
          {approved ? 'Limpiar' : 'Cancelar y limpiar'}
        </button>
      </div>
    </div>
  );
}
