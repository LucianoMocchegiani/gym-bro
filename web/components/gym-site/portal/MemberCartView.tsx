'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CartLineList } from '@/components/CartLineList';
import {
  getMyGymMpConnected,
  startMyCartCheckout,
} from '@/lib/api/member-portal';
import { cartLineKey, useMemberCart } from '@/lib/member-cart';
import { mpCheckoutErrorText, redirectToMpCheckout } from '@/lib/mp-checkout';
import { useMemberArea } from './MemberArea';

/**
 * Carrito del socio: packs y clases sueltas en un solo pago de Mercado Pago
 * (CU-PAG-001). MP vuelve a `/cuenta?compra=`; el webhook activa todo.
 */
export function MemberCartView() {
  const { cartOwner } = useMemberArea();
  const cart = useMemberCart(cartOwner);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  async function pay() {
    setError(null);
    setPaying(true);
    try {
      if (!(await getMyGymMpConnected())) {
        setError('El pago online no está disponible. Consultá en el gym.');
        setPaying(false);
        return;
      }
      const checkout = await startMyCartCheckout(
        cart.lines.map((l) => ({ kind: l.kind, id: l.id })),
      );
      cart.clear();
      redirectToMpCheckout(checkout);
    } catch (err) {
      setError(mpCheckoutErrorText(err));
      setPaying(false);
    }
  }

  return (
    <section className="mkt-inner mkt-section">
      <p className="eyebrow">Carrito</p>
      <h2 className="mkt-h2">Tu compra</h2>
      {error ? <p className="error">{error}</p> : null}
      {cart.count === 0 ? (
        <p className="muted">
          Tu carrito está vacío. Sumá un <Link href="/cuenta/tienda">plan</Link>{' '}
          o una <Link href="/cuenta/clases">clase suelta</Link>.
        </p>
      ) : (
        <div className="portal-cart">
          <CartLineList
            items={cart.lines.map((l) => ({ ...l, key: cartLineKey(l) }))}
            total={cart.total}
            onRemove={(key) => {
              const line = cart.lines.find((l) => cartLineKey(l) === key);
              if (line) {
                cart.remove(line.kind, line.id);
              }
            }}
          />
          <p className="muted small">
            Pagás todo junto en Mercado Pago. Los planes y las clases se
            activan apenas se aprueba el pago.
          </p>
          <button
            type="button"
            className="mkt-btn-primary"
            disabled={paying}
            onClick={() => void pay()}
          >
            {paying ? 'Abriendo Mercado Pago…' : 'Pagar con Mercado Pago'}
          </button>
        </div>
      )}
    </section>
  );
}
