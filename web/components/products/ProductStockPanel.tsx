'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiClientError } from '@/lib/api/client';
import {
  adjustProductStock,
  listProductStockMovements,
  type ProductDetail,
  type ProductStockMovement,
} from '@/lib/api/products';
import { formatMoney } from '@/lib/cash-labels';

export function ProductStockPanel({
  product,
  canWrite,
  onUpdated,
}: {
  product: ProductDetail;
  canWrite: boolean;
  onUpdated: () => void;
}) {
  const [current, setCurrent] = useState(product);
  const [rows, setRows] = useState<ProductStockMovement[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadMovements = useCallback(async () => {
    const result = await listProductStockMovements(product.id, {
      page,
      pageSize: 10,
    });
    setRows(result.items);
    setHasMore(result.hasMore);
  }, [page, product.id]);

  useEffect(() => {
    void loadMovements().catch(() => setError('No se pudo cargar el historial.'));
  }, [loadMovements]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await adjustProductStock(product.id, {
        type,
        quantity: Number(quantity),
        reason: reason.trim(),
      });
      const latest = await listProductStockMovements(product.id, {
        page: 1,
        pageSize: 10,
      });
      setCurrent(result.product);
      setRows(latest.items);
      setHasMore(latest.hasMore);
      setPage(1);
      setQuantity('');
      setReason('');
      onUpdated();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo ajustar el stock.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-form">
      <p>
        <strong>{current.name}</strong> · {formatMoney(current.price)}
      </p>
      <p className="stat-value">Stock actual: {current.stockQuantity}</p>
      {canWrite ? (
        <form className="admin-form" onSubmit={(event) => void submit(event)}>
          <label>
            Movimiento
            <select
              value={type}
              onChange={(event) => setType(event.target.value as 'IN' | 'OUT')}
            >
              <option value="IN">Ingreso</option>
              <option value="OUT">Salida</option>
            </select>
          </label>
          <label>
            Cantidad
            <input
              type="number"
              min={1}
              step={1}
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>
          <label>
            Motivo (obligatorio)
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
              maxLength={500}
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button
            type="submit"
            className="primary"
            disabled={busy || !reason.trim()}
          >
            {busy ? 'Guardando…' : 'Registrar movimiento'}
          </button>
        </form>
      ) : null}
      {!canWrite && error ? <p className="error">{error}</p> : null}
      <h2>Historial de stock</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Stock resultante</th>
              <th>Motivo</th>
              <th>Registró</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.createdAt).toLocaleString('es')}</td>
                <td>{row.type === 'IN' ? 'Ingreso' : 'Salida'}</td>
                <td>
                  {row.quantityDelta > 0 ? '+' : ''}
                  {row.quantityDelta}
                </td>
                <td>{row.quantityAfter}</td>
                <td>{row.reason}</td>
                <td>{row.createdBy ?? '—'}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6}>Todavía no hay movimientos.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="form-actions">
        <button
          type="button"
          className="btn ghost"
          disabled={page <= 1}
          onClick={() => setPage((value) => value - 1)}
        >
          Anterior
        </button>
        <span className="muted small">Página {page}</span>
        <button
          type="button"
          className="btn ghost"
          disabled={!hasMore}
          onClick={() => setPage((value) => value + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
