'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiClientError } from '@/lib/api/client';
import {
  getTenantSettings,
  updateTenantSettings,
} from '@/lib/api/tenant-settings';

export function MpPaymentDiscounts() {
  const [qrDiscount, setQrDiscount] = useState('5');
  const [linkDiscount, setLinkDiscount] = useState('0');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getTenantSettings()
      .then((settings) => {
        if (cancelled) return;
        setQrDiscount(String(settings.qrPointDiscountPercent));
        setLinkDiscount(String(settings.mpLinkDiscountPercent));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'No se pudieron cargar los descuentos de Mercado Pago.',
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

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const settings = await updateTenantSettings({
        qrPointDiscountPercent: Number(qrDiscount),
        mpLinkDiscountPercent: Number(linkDiscount),
      });
      setQrDiscount(String(settings.qrPointDiscountPercent));
      setLinkDiscount(String(settings.mpLinkDiscountPercent));
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudieron guardar los descuentos.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="mp-discounts-title" style={{ marginTop: '1rem' }}>
      <h3 id="mp-discounts-title">Descuentos predeterminados en Caja</h3>
      {loading ? <p className="muted small">Cargando…</p> : (
        <form className="admin-form" onSubmit={(event) => void save(event)}>
          <label>
            Mercado Pago Point (QR) (%)
            <input
              type="number"
              min={0}
              max={99}
              step={0.01}
              required
              value={qrDiscount}
              onChange={(event) => setQrDiscount(event.target.value)}
            />
          </label>
          <label>
            Link de pago Mercado Pago (%)
            <input
              type="number"
              min={0}
              max={99}
              step={0.01}
              required
              value={linkDiscount}
              onChange={(event) => setLinkDiscount(event.target.value)}
            />
          </label>
          <p className="muted small">
            Caja precarga este porcentaje según el medio y permite cambiarlo
            antes de cada cobro. Valores iniciales: QR 5 %, link 0 %.
          </p>
          {error ? <p className="error" role="alert">{error}</p> : null}
          {saved ? <p className="ok-msg">Guardado.</p> : null}
          <button type="submit" className="primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar descuentos'}
          </button>
        </form>
      )}
    </section>
  );
}
