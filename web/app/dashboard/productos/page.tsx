'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DataTable,
  ListToolbar,
  listCountDescription,
} from '@/components/AdminList';
import { AdminModal } from '@/components/AdminModal';
import { AdminShell } from '@/components/AdminShell';
import { DeleteRowButton } from '@/components/DeleteRowButton';
import { ProductForm } from '@/components/products/ProductForm';
import { ProductStockPanel } from '@/components/products/ProductStockPanel';
import { RequireStaff } from '@/components/RequireStaff';
import { IconEdit, RowActions, RowIconButton } from '@/components/RowActions';
import { PageSkeleton } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import {
  deleteProduct,
  getProduct,
  listProducts,
  type ProductDetail,
} from '@/lib/api/products';
import { formatMoney } from '@/lib/cash-labels';
import { useAuth } from '@/lib/auth/AuthProvider';
import { hasAllPermissions } from '@/lib/nav-permissions';

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
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(
    null,
  );
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listProducts({
        q: query || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(result.items);
      setTotal(result.total);
      setHasMore(result.hasMore);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudieron cargar los productos.',
      );
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = editId || stockId;
    if (!id) {
      setSelectedProduct(null);
      setSelectionError(null);
      return;
    }
    let cancelled = false;
    setSelectionLoading(true);
    setSelectionError(null);
    void getProduct(id)
      .then((product) => {
        if (!cancelled) setSelectedProduct(product);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSelectionError(
            err instanceof ApiClientError
              ? err.message
              : 'No se pudo cargar el producto.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setSelectionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editId, stockId]);

  function go(search: string) {
    setFlash(null);
    router.replace(
      search ? `/dashboard/productos?${search}` : '/dashboard/productos',
      { scroll: false },
    );
  }

  return (
    <AdminShell
      title="Productos"
      subtitle="Catálogo y existencias de tu organización."
      actions={
        canWrite ? (
          <button type="button" className="btn" onClick={() => go('nuevo=1')}>
            + Nuevo producto
          </button>
        ) : null
      }
    >
      {flash ? <p className="ok-msg">{flash}</p> : null}
      <ListToolbar hint="El stock inicial de cada producto es cero.">
        <label className="toolbar-field">
          Buscar
          <input
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
            placeholder="Nombre del producto"
          />
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
        header={
          <>
            <th>Producto</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Estado</th>
            <th />
          </>
        }
      >
        {rows.map((product) => (
          <tr key={product.id}>
            <td>{product.name}</td>
            <td>{formatMoney(product.price)}</td>
            <td>{product.stockQuantity}</td>
            <td>{product.active ? 'Activo' : 'Archivado'}</td>
            <td>
              <RowActions>
                {canWrite ? (
                  <RowIconButton
                    label="Editar producto"
                    onClick={() => go(`editar=${product.id}`)}
                  >
                    <IconEdit />
                  </RowIconButton>
                ) : null}
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => go(`stock=${product.id}`)}
                >
                  Stock
                </button>
                {canWrite ? (
                  <DeleteRowButton
                    dialogTitle={`¿Eliminar ${product.name}?`}
                    description="Solo se puede borrar un producto sin movimientos de stock. Si tiene historial, archiválo desde Editar."
                    onDelete={() => deleteProduct(product.id)}
                    onSuccess={() => {
                      setFlash(`Se eliminó ${product.name}.`);
                      void load();
                    }}
                    onError={(err) => setError(err.message)}
                  />
                ) : null}
              </RowActions>
            </td>
          </tr>
        ))}
      </DataTable>
      <AdminModal
        open={createOpen && canWrite}
        onClose={() => go('')}
        title="Nuevo producto"
        description="Los productos se crean con stock inicial en cero."
        size="comfortable"
      >
        <ProductForm
          onSuccess={() => {
            go('');
            void load();
          }}
          onCancel={() => go('')}
        />
      </AdminModal>
      <AdminModal
        open={Boolean(editId && canWrite)}
        onClose={() => go('')}
        title="Editar producto"
        size="comfortable"
      >
        {selectionLoading ? (
          <p>Cargando producto…</p>
        ) : selectionError ? (
          <p className="error">{selectionError}</p>
        ) : selectedProduct ? (
          <ProductForm
            key={editId}
            product={selectedProduct}
            onSuccess={() => {
              go('');
              void load();
            }}
            onCancel={() => go('')}
          />
        ) : null}
      </AdminModal>
      <AdminModal
        open={Boolean(stockId)}
        onClose={() => go('')}
        title="Existencias"
        size="wide"
      >
        {selectionLoading ? (
          <p>Cargando producto…</p>
        ) : selectionError ? (
          <p className="error">{selectionError}</p>
        ) : selectedProduct ? (
          <ProductStockPanel
            key={stockId}
            product={selectedProduct}
            canWrite={canWrite}
            onUpdated={() => void load()}
          />
        ) : null}
      </AdminModal>
    </AdminShell>
  );
}
