'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { listSessions } from '@/lib/api/sessions';
import type { SessionDetail, SessionStatus } from '@/lib/api/sessions';

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/**
 * Listado de sesiones puntuales (CU-SER-003).
 */
export default function SesionesPage() {
  return (
    <RequireStaff>
      <SesionesInner />
    </RequireStaff>
  );
}

const PAGE_SIZE = 20;

function SesionesInner() {
  const [rows, setRows] = useState<SessionDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'ALL'>(
    'PUBLISHED',
  );
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await listSessions({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
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
            : 'No se pudieron cargar sesiones',
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
  }, [statusFilter, page]);

  return (
    <AdminShell
      title="Sesiones"
      actions={
        <Link href="/sesiones/nuevo" className="btn">
          + Nueva
        </Link>
      }
    >
      <Panel className="toolbar">
        <label className="toolbar-field">
          Estado
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value as SessionStatus | 'ALL');
            }}
          >
            <option value="PUBLISHED">Publicadas</option>
            <option value="CANCELLED">Canceladas</option>
            <option value="ALL">Todas</option>
          </select>
        </label>
      </Panel>

      {loading ? <p className="muted">Cargando…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error ? (
        <Panel
          title="Listado"
          description={`${total} sesión${total === 1 ? '' : 'es'} · página ${page}`}
          className="table-wrap"
        >
          {rows.length === 0 ? (
            <p className="muted">No hay sesiones con ese filtro.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Cupo</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td>{s.serviceName}</td>
                    <td>{formatWhen(s.startsAt)}</td>
                    <td>{formatWhen(s.endsAt)}</td>
                    <td>
                      {s.bookedCount}/{s.capacity}
                    </td>
                    <td>
                      <span
                        className={`status-pill ${s.status === 'PUBLISHED' ? 'active' : 'inactive'}`}
                      >
                        {s.status === 'PUBLISHED'
                          ? 'Publicada'
                          : 'Cancelada'}
                      </span>
                    </td>
                    <td className="row-actions">
                      <Link href={`/sesiones/${s.id}`}>Editar</Link>
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
