'use client';

import { useRouter } from 'next/navigation';
import { ListPagination } from '@/components/AdminList';
import type { ListResult } from '@/lib/api/list';
import type { PublicProduct } from '@/lib/api/public-tenant-catalog';
import styles from './PublicProductCatalog.module.css';

const price = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function PublicProductCatalog({
  result,
}: {
  result: ListResult<PublicProduct> | null;
}) {
  const router = useRouter();
  return (
    <section id="productos" className={styles.section}>
      <h2>Productos</h2>
      {result === null ? (
        <p role="status">No se pudo cargar el catálogo de productos.</p>
      ) : result.items.length === 0 ? (
        <p className={styles.muted}>Todavía no hay productos publicados.</p>
      ) : (
        <>
          <p className={styles.count}>{result.total} productos</p>
          <div className={styles.grid}>
            {result.items.map((product) => (
              <article key={product.id} className={styles.card}>
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className={styles.image}
                    src={product.imageUrl}
                    alt={product.name}
                    loading="lazy"
                  />
                ) : (
                  <div className={styles.placeholder} aria-hidden="true">
                    Sin imagen
                  </div>
                )}
                <div className={styles.detail}>
                  <h3>{product.name}</h3>
                  {product.description ? <p>{product.description}</p> : null}
                  <strong>{price.format(product.price)}</strong>
                </div>
              </article>
            ))}
          </div>
          <ListPagination
            page={result.page}
            hasMore={result.hasMore}
            onPageChange={(page) => router.push(`/?page=${page}#productos`)}
          />
        </>
      )}
    </section>
  );
}
