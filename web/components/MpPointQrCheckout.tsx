'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { IconReceipt } from '@/components/RowActions';
import { StatusPill } from '@/components/StatusPill';

export function MpPointQrCheckout({
  qrData,
  status,
  approved,
  onClear,
  onReceipt,
}: {
  qrData: string;
  status: string | null;
  approved: boolean;
  onClear: () => void;
  onReceipt: () => void;
}) {
  const size = 220;
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(qrData, {
      width: size,
      margin: 2,
      color: { dark: '#0a0a0a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(
      (url) => {
        if (!cancelled) {
          setDataUrl(url);
          setError(null);
        }
      },
      () => {
        if (!cancelled) {
          setDataUrl(null);
          setError('No se pudo generar el QR');
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [qrData]);

  const normalizedStatus = status?.toLowerCase();
  const label = approved
    ? 'Aprobado'
    : normalizedStatus === 'expired'
      ? 'Vencido'
      : normalizedStatus === 'canceled' || normalizedStatus === 'cancelled'
        ? 'Cancelado'
        : 'Pendiente';

  return (
    <div className="mp-checkout">
      <div className="mp-checkout-head">
        <p className="cart-name">QR de Mercado Pago Point</p>
        <StatusPill tone={approved ? 'ok' : 'warn'}>{label}</StatusPill>
      </div>
      <div className="mp-checkout-qr">
        {error ? (
          <p className="error">{error}</p>
        ) : dataUrl ? (
          <Image
            src={dataUrl}
            alt="QR de pago de Mercado Pago Point"
            width={size}
            height={size}
            unoptimized
          />
        ) : (
          <div
            className="venue-qr-skeleton"
            style={{ '--qr-size': `${size}px` } as CSSProperties}
            aria-label="Generando QR de pago"
          />
        )}
      </div>
      <p className="muted small">
        El socio escanea este QR con Mercado Pago. Caja verifica el pago con
        Mercado Pago antes de emitir el comprobante.
      </p>
      <div className="mp-checkout-actions">
        {approved ? (
          <button type="button" className="btn primary" onClick={onReceipt}>
            <IconReceipt />
            Ver comprobante
          </button>
        ) : (
          <p className="muted small mp-checkout-wait">Esperando el pago…</p>
        )}
        <button type="button" className="btn ghost" onClick={onClear}>
          {approved ? 'Limpiar' : 'Cancelar y limpiar'}
        </button>
      </div>
    </div>
  );
}
