'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getCashDiscountDefaults } from '@/lib/api/cash-discount';

export function CajaMpDiscountControls() {
  const pathname = usePathname();
  const [discounts, setDiscounts] = useState<{
    qr: string;
    link: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pathname !== '/dashboard/caja') {
      return;
    }
    sessionStorage.removeItem('caja-mp-qr-discount');
    sessionStorage.removeItem('caja-mp-link-discount');
    void getCashDiscountDefaults()
      .then((defaults) => {
        setDiscounts({
          qr: String(defaults.qrPointDiscountPercent),
          link: String(defaults.mpLinkDiscountPercent),
        });
        sessionStorage.setItem(
          'caja-mp-qr-discount',
          String(defaults.qrPointDiscountPercent),
        );
        sessionStorage.setItem(
          'caja-mp-link-discount',
          String(defaults.mpLinkDiscountPercent),
        );
      })
      .catch(() => setError('No se pudieron cargar los descuentos MP de Config.'));
  }, [pathname]);

  if (pathname !== '/dashboard/caja') {
    return null;
  }

  function update(medio: 'qr' | 'link', value: string) {
    setDiscounts((current) => (current ? { ...current, [medio]: value } : current));
    sessionStorage.setItem(`caja-mp-${medio}-discount`, value);
  }

  return (
    <section aria-label="Descuentos Mercado Pago en Caja" className="panel">
      <h2>Descuentos Mercado Pago en este cobro</h2>
      {discounts ? (
        <div className="admin-form">
          <label>
            Mercado Pago Point (QR) (%)
            <input
              type="number"
              min={0}
              max={99}
              step={0.01}
              value={discounts.qr}
              onChange={(event) => update('qr', event.target.value)}
            />
          </label>
          <label>
            Link de pago Mercado Pago (%)
            <input
              type="number"
              min={0}
              max={99}
              step={0.01}
              value={discounts.link}
              onChange={(event) => update('link', event.target.value)}
            />
          </label>
          <p className="muted small">
            Se precargan los defaults de Config. Podés ajustar el porcentaje
            para los cobros que generes en Caja.
          </p>
        </div>
      ) : (
        <p className={error ? 'error' : 'muted small'}>
          {error ?? 'Cargando descuentos desde Config…'}
        </p>
      )}
    </section>
  );
}
