'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DataTable, ListToolbar, listCountDescription } from '@/components/AdminList';
import { AdminModal } from '@/components/AdminModal';
import { AdminShell } from '@/components/AdminShell';
import { ProductForm } from '@/components/products/ProductForm';
import { ProductStockPanel } from '@/components/products/ProductStockPanel';
import { RequireStaff } from '@/components/RequireStaff';
import { IconEdit, RowActions, RowIconButton } from '@/components/RowActions';
import { PageSkeleton } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import { deleteProduct, listProducts, type ProductDetail } from '@/lib/api/products';
import { formatMoney } from '@/lib/cash-labels';
import { hasAllPermissions } from '@/lib/nav-permissions';
import { useAuth } from '@/lib/auth/AuthProvider';

const PAGE_SIZE = 20;

export default function ProductosPage() {
  return (
    <RequireStaff>
      <Suspense fallback={<PageSkeleton />}>
        <ProductosInner />
      </Suspense>
    </RequireStaff>
  );
}

function ProductosInner() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('editar');
  const stockId = params.get('stock');
  const createOpen = params.get('nuevo') === '1';
  const { session } = useAuth();
  const canWrite = hasAllPermissions(session?.permissionCodes, ['products.write']);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ProductDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listProducts({ q: query || undefined, page, pageSize: PAGE_SIZE });
      setRows(result.items);
      setTotal(result.total);
      setHasMore(result.hasMore);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'No se pudieron cargar los productos.');
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => { void load(); }, [load]);

  function go(search: string) {
    setFlash(null);
    router.replace(search ? `/dashboard/productos?${search}` : '/dashboard/productos', { scroll: false });
  }

  return (
    <AdminShell
      title="Productos"
      subtitle="Catálogo y existencias de tu organización."
      actions={canWrite ? <button type="button" className="btn" onClick={() => go('nuevo=1')}>+ Nuevo producto</button> : null}
    >
      {flash ? <p className="ok-msg">{flash}</p> : null}
      <ListToolbar hint="El stock inicial de cada producto es cero.">
        <label className="toolbar-field">
          Buscar
          <input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Nombre del producto" />
        </label>
      </ListToolbar>
      <DataTable
        description={listCountDescription(total, page, 'producto', 'productos')}
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText="Todavía no hay productos."
        page={page}
        hasMore={hasMore}
        onPageChange={setPage}
        header={<><th>Producto</th><th>Precio</th><th>Stock</th><th>Estado</th><th /></>}
      >
        {rows.map((product) => (
          <tr key={product.id}>
            <td>{product.name}</td>
            <td>{formatMoney(product.price)}</td>
            <td>{product.stockQuantity}</td>
            <td>{product.active ? 'Activo' : 'Archivado'}</td>
            <td>
              <RowActions>
                <RowIconButton label="Editar producto" onClick={() => go(`editar=${product.id}`)}><IconEdit /></RowIconButton>
                <button type="button" className="btn ghost small" onClick={() => go(`stock=${product.id}`)}>Stock</button>
                {canWrite ? (
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={async () => {
                      try {
                        await deleteProduct(product.id);
                        setFlash(`Se eliminó ${product.name}.`);
                        void load();
                      } catch (err) {
                        setError(err instanceof ApiClientError ? err.message : 'No se pudo eliminar el producto.');
                      }
                    }}
                  >
                    Eliminar
                  </button>
                ) : null}
              </RowActions>
            </td>
          </tr>
        ))}
      </DataTable>
      <AdminModal open={createOpen} onClose={() => go('')} title="Nuevo producto" description="Los productos se crean con stock inicial en cero." size="comfortable">
        <ProductForm onSuccess={() => { go(''); void load(); }} onCancel={() => go('')} />
      </AdminModal>
      <AdminModal open={Boolean(editId)} onClose={() => go('')} title="Editar producto" size="comfortable">
        {editId ? (
          <ProductForm
            key={editId}
            product={rows.find((row) => row.id === editId)}
            onSuccess={() => { go(''); void load(); }}
            onCancel={() => go('')}
          />
        ) : null}
      </AdminModal>
      <AdminModal open={Boolean(stockId)} onClose={() => go('')} title="Existencias" size="wide">
        {stockId ? (
          <ProductStockPanel
            key={stockId}
            product={rows.find((row) => row.id === stockId)!}
            onUpdated={() => void load()}
          />
        ) : null}
      </AdminModal>
    </AdminShell>
  );
}
