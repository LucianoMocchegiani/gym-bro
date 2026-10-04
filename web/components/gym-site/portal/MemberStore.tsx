'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PackPlanCard } from '@/components/marketing/PackPlanCard';
import { ApiClientError } from '@/lib/api/client';
import {
  getMyGymMpConnected,
  listMyStorePacks,
} from '@/lib/api/member-portal';
import {
  storePackItems,
  type StorePack,
} from '@/lib/api/public-tenant-catalog';
import { packCartLine, useMemberCart } from '@/lib/member-cart';
import { useMemberArea } from './MemberArea';

/** Tienda del socio: planes del gym para sumar al carrito (CU-PAG-001). */
export function MemberStore() {
  const { cartOwner } = useMemberArea();
  const cart = useMemberCart(cartOwner);
  const [packs, setPacks] = useState<StorePack[] | null>(null);
  const [mpConnected, setMpConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [items, connected] = await Promise.all([
          listMyStorePacks(),
          getMyGymMpConnected(),
        ]);
        if (!cancelled) {
          setPacks(items);
          setMpConnected(connected);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'No se pudieron cargar los planes',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function packAction(pack: StorePack) {
    if (!mpConnected || pack.price < 1) {
      return <p className="muted small">Se contrata en el gym.</p>;
    }
    if (cart.has('PACK', pack.id)) {
      return (
        <Link className="mkt-btn-ghost" href="/portal/carrito">
          En el carrito
        </Link>
      );
    }
    return (
      <button
        type="button"
        className="mkt-btn-primary"
        onClick={() => cart.add(packCartLine(pack))}
      >
        Agregar al carrito
      </button>
    );
  }

  return (
    <section className="mkt-inner mkt-section">
      <p className="eyebrow">Tienda</p>
      <h2 className="mkt-h2">Planes</h2>
      {error ? <p className="error">{error}</p> : null}
      {packs && !mpConnected ? (
        <p className="muted">
          El pago online no está disponible. Consultá en el gym.
        </p>
      ) : null}
      {!packs ? (
        error ? null : <p className="muted">Cargando planes…</p>
      ) : packs.length === 0 ? (
        <p className="muted">Todavía no hay planes publicados.</p>
      ) : (
        <div className="mkt-plans">
          {packs.map((pack) => (
            <PackPlanCard
              key={pack.id}
              name={pack.name}
              price={pack.price}
              billingPeriod={pack.billingPeriod}
              description={pack.description}
              items={storePackItems(pack)}
              action={packAction(pack)}
            />
          ))}
        </div>
      )}
      {cart.count > 0 ? (
        <p className="small">
          <Link href="/portal/carrito">Ir al carrito ({cart.count})</Link>
        </p>
      ) : null}
    </section>
  );
}
