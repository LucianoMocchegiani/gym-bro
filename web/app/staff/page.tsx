'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { listStaff } from '@/lib/api/staff';
import type { StaffUserDetail } from '@/lib/api/staff';

const PAGE_SIZE = 20;

/**
 * Listado de staff del gym (CU-ROL-004).
 */
export default function StaffPage() {
  return (
    <RequireStaff>
      <StaffInner />
    </RequireStaff>
  );
}

function StaffInner() {
  const [rows, setRows] = useState<StaffUserDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await listStaff({
          q: appliedQuery || undefined,
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
            : 'No se pudo cargar el staff',
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
  }, [appliedQuery, page]);

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setAppliedQuery(query.trim());
  }

  return (
    <AdminShell
      title="Staff"
      actions={
        <Link href="/staff/nuevo" className="btn">
          + Nuevo
        </Link>
      }
    >
      <Panel className="toolbar">
        <form className="toolbar-field search-form" onSubmit={onSearchSubmit}>
          <label>
            Buscar
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre o email"
              autoComplete="off"
            />
          </label>
          <button type="submit" className="btn ghost">
            Buscar
          </button>
        </form>
      </Panel>

      {loading ? <p className="muted">Cargando…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error ? (
        <Panel
          title="Listado"
          description={`${total} usuario${total === 1 ? '' : 's'} · página ${page}`}
          className="table-wrap"
        >
          {rows.length === 0 ? (
            <p className="muted">No hay staff.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Roles</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name ?? '—'}</td>
                    <td>{s.email}</td>
                    <td>
                      {s.roles.length === 0
                        ? '—'
                        : s.roles.map((r) => r.name).join(', ')}
                    </td>
                    <td>
                      <span
                        className={`status-pill ${s.active ? 'active' : 'inactive'}`}
                      >
                        {s.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="row-actions">
                      <Link href={`/staff/${s.id}`}>Roles</Link>
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
