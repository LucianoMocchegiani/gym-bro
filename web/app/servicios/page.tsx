'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { listServices } from '@/lib/api/services';
import type { ServiceDetail, ServiceType } from '@/lib/api/services';
import { formatServiceType } from '@/lib/catalog-labels';
import { formatMoney } from '@/lib/cash-labels';

/**
 * Listado de servicios del catálogo (CU-SER-001).
 */
export default function ServiciosPage() {
  return (
    <RequireStaff>
      <ServiciosInner />
    </RequireStaff>
  );
}

const PAGE_SIZE = 20;

function ServiciosInner() {
  const [rows, setRows] = useState<ServiceDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ServiceType | 'ALL'>('ALL');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'true' | 'false'>(
    'ALL',
  );
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await listServices({
          type: typeFilter === 'ALL' ? undefined : typeFilter,
          active:
            activeFilter === 'ALL' ? undefined : activeFilter === 'true',
          page,
          pageSize: PAGE_SIZE,
        });
        if (cancelled) {
          return;
        }
        setRows(data.items);
        setTotal(data.total);
        setHasMore(data.hasMore);
        setError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudieron cargar servicios',
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [typeFilter, activeFilter, page]);

  return (
    <AdminShell
      title="Servicios"
      actions={
        <Link href="/servicios/nuevo" className="btn">
          + Nuevo
        </Link>
      }
    >
      <Panel className="toolbar">
        <label className="toolbar-field">
          Tipo
          <select
            value={typeFilter}
            onChange={(e) => {
              setPage(1);
              setTypeFilter(e.target.value as ServiceType | 'ALL');
            }}
          >
            <option value="ALL">Todos</option>
            <option value="ACCESO_LIBRE">Acceso libre</option>
            <option value="POR_SESIONES">Por sesiones</option>
          </select>
        </label>
        <label className="toolbar-field">
          Activo
          <select
            value={activeFilter}
            onChange={(e) => {
              setPage(1);
              setActiveFilter(e.target.value as 'ALL' | 'true' | 'false');
            }}
          >
            <option value="ALL">Todos</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </label>
      </Panel>

      {loading ? <p className="muted">Cargando…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error ? (
        <Panel
          title="Listado"
          description={`${total} servicio${total === 1 ? '' : 's'} · página ${page}`}
          className="table-wrap"
        >
          {rows.length === 0 ? (
            <p className="muted">No hay servicios con ese filtro.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Drop-in</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{formatServiceType(s.type)}</td>
                    <td>
                      {s.dropInPrice != null
                        ? formatMoney(s.dropInPrice)
                        : '—'}
                    </td>
                    <td>
                      <span
                        className={`status-pill ${s.active ? 'active' : 'inactive'}`}
                      >
                        {s.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="row-actions">
                      <Link href={`/servicios/${s.id}`}>Editar</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="pager">
            <button
              type="button"
              className="btn ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <span className="muted small">Página {page}</span>
            <button
              type="button"
              className="btn ghost"
              disabled={!hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </Panel>
      ) : null}
    </AdminShell>
  );
}
