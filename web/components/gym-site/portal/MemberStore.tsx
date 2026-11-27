'use client';

import { useEffect, useState } from 'react';
import { ListPagination } from '@/components/AdminList';
import { PackPlanCard } from '@/components/marketing/PackPlanCard';
import { ApiClientError } from '@/lib/api/client';
import type { ListResult } from '@/lib/api/list';
import {
  getMyGymMpConnected,
  listMyStorePacks,
} from '@/lib/api/member-portal';
import { listPublicStoreProducts } from '@/lib/api/member-store';
import {
  storePackItems,
  type PublicProduct,
  type StorePack,
} from '@/lib/api/public-tenant-catalog';
import { formatMoney } from '@/lib/cash-labels';
import { packCartLine, productCartLine, useMemberCart } from '@/lib/member-cart';
import { useMemberArea } from './MemberArea';

/** Tienda del socio: planes y productos para sumar al carrito. */
export function MemberStore() {
  const { cartOwner, slug, hasPlans, hasProducts } = useMemberArea();
  const cart = useMemberCart(cartOwner);
  const [packs, setPacks] = useState<StorePack[] | null>(null);
  const [products, setProducts] = useState<ListResult<PublicProduct> | null>(null);
  const [productPage, setProductPage] = useState(1);
  const [mpConnected, setMpConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [connected, storePacks, storeProducts] = await Promise.all([
          getMyGymMpConnected(),
          hasPlans ? listMyStorePacks() : Promise.resolve([]),
          hasProducts ? listPublicStoreProducts(slug, productPage) : Promise.resolve(null),
        ]);
        if (!cancelled) {
          setPacks(storePacks);
          setProducts(storeProducts);
          setMpConnected(connected);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'No se pudo cargar la tienda',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasPlans, hasProducts, productPage, slug]);

  function packAction(pack: StorePack) {
    if (mpConnected !== true || pack.price < 1) {
      return <p className="muted small">Se contrata en el gym.</p>;
    }
    if (cart.has('PACK', pack.id)) {
      return (
        <a className="mkt-btn-ghost" href="/portal/carrito">
          En el carrito
        </a>
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

  function productAction(product: PublicProduct) {
    if (mpConnected !== true || product.price < 1) {
      return <p className="muted small">El pago online no está disponible.</p>;
    }
    return (
      <button
        type="button"
        className="mkt-btn-primary"
        onClick={() => cart.add(productCartLine(product))}
      >
        {cart.has('PRODUCT', product.id) ? 'Agregar otra unidad' : 'Agregar al carrito'}
      </button>
    );
  }

  return (
    <section className="mkt-inner mkt-section">
      <p className="eyebrow">Tienda</p>
      <h2 className="mkt-h2">{hasPlans ? 'Planes y productos' : 'Productos'}</h2>
      {error ? <p className="error">{error}</p> : null}
      {mpConnected === false ? (
        <p className="muted">
          El pago online no está disponible. Consultá en el gym.
        </p>
      ) : null}
      {hasPlans ? (
        <>
          <h3>Planes</h3>
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
        </>
      ) : null}
      {hasProducts ? (
        <>
          <h3>Productos</h3>
          {!products ? (
            error ? null : <p className="muted">Cargando productos…</p>
          ) : products.items.length === 0 ? (
            <p className="muted">Todavía no hay productos publicados.</p>
          ) : (
            <>
              <p className="muted small">{products.total} productos</p>
              <div className="mkt-plans">
                {products.items.map((product) => (
                  <article key={product.id} className="mkt-plan">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt={product.name} loading="lazy" />
                    ) : null}
                    <h3>{product.name}</h3>
                    {product.description ? <p>{product.description}</p> : null}
                    <p><strong>{formatMoney(product.price)}</strong></p>
                    {productAction(product)}
                  </article>
                ))}
              </div>
              <ListPagination
                page={products.page}
                hasMore={products.hasMore}
                onPageChange={setProductPage}
              />
            </>
          )}
        </>
      ) : null}
      {cart.count > 0 ? (
        <p className="small">
          <a href="/portal/carrito">Ir al carrito ({cart.count})</a>
        </p>
      ) : null}
    </section>
  );
}
