'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { getCashDiscountDefaults } from '@/lib/api/cash-discount';

export function CajaMpDiscountControls() {
  const pathname = usePathname();
  const isCaja = pathname?.replace(/\/+$/, '') === '/dashboard/caja';
  const [discounts, setDiscounts] = useState<{ qr: string; link: string } | null>(
    null,
  );
  const [method, setMethod] = useState<'qr' | 'link' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isCaja) return;
    sessionStorage.removeItem('caja-mp-qr-discount');
    sessionStorage.removeItem('caja-mp-link-discount');
    void getCashDiscountDefaults()
      .then((defaults) => {
        const next = {
          qr: String(defaults.qrPointDiscountPercent),
          link: String(defaults.mpLinkDiscountPercent),
        };
        setDiscounts(next);
        sessionStorage.setItem('caja-mp-qr-discount', next.qr);
        sessionStorage.setItem('caja-mp-link-discount', next.link);
      })
      .catch(() => setError('No se pudieron cargar los descuentos MP de Config.'));
  }, [isCaja]);

  useEffect(() => {
    if (!isCaja) return;
    let disposed = false;
    let container: HTMLDivElement | null = null;
    let form: HTMLFormElement | null = null;
    const updateMethod = () => {
      const selected = form?.querySelector<HTMLInputElement>(
        'input[name="medio"]:checked',
      )?.parentElement?.textContent?.toLowerCase();
      setMethod(selected?.includes('point') ? 'qr' : selected?.includes('link') ? 'link' : null);
    };
    const attach = () => {
      if (disposed || container) return;
      // shortcut: Caja's form has no component slot; render directly there when the form is extracted.
      const fieldset = document.querySelector<HTMLFieldSetElement>(
        '.cash-cart form fieldset.mode-toggle',
      );
      if (!fieldset) return;
      container = document.createElement('div');
      fieldset.after(container);
      form = fieldset.closest('form');
      form?.addEventListener('change', updateMethod);
      updateMethod();
      setHost(container);
      observer.disconnect();
    };
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    attach();
    return () => {
      disposed = true;
      observer.disconnect();
      form?.removeEventListener('change', updateMethod);
      container?.remove();
      setHost(null);
    };
  }, [isCaja]);

  function update(medio: 'qr' | 'link', value: string) {
    setDiscounts((current) => (current ? { ...current, [medio]: value } : current));
    sessionStorage.setItem(`caja-mp-${medio}-discount`, value);
  }

  if (!host) return null;
  return createPortal(
    method ? (
      discounts ? (
        <label>
          Descuento (%)
          <input
            type="number"
            min={0}
            max={99}
            step={0.01}
            required
            value={discounts[method]}
            onChange={(event) => update(method, event.target.value)}
          />
        </label>
      ) : (
        <p className={error ? 'error' : 'muted small'}>
          {error ?? 'Cargando descuento desde Config…'}
        </p>
      )
    ) : null,
    host,
  );
}
