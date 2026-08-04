'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { listMembers } from '@/lib/api/members';
import type { MemberDetail, MemberStatus } from '@/lib/api/members';
import { formatMemberStatus } from '@/lib/member-labels';

const PAGE_SIZE = 20;

/**
 * Listado de afiliados del gym (CU-AFI).
 */
export default function AfiliadosPage() {
  return (
    <RequireStaff>
      <AfiliadosInner />
    </RequireStaff>
  );
}

function AfiliadosInner() {
  const [rows, setRows] = useState<MemberDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'ALL'>(
    'ALL',
  );
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
        const data = await listMembers({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
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
            : 'No se pudieron cargar afiliados',
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
  }, [statusFilter, appliedQuery, page]);

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setAppliedQuery(query.trim());
  }

  return (
    <AdminShell
      title="Afiliados"
      actions={
        <Link href="/afiliados/nuevo" className="btn">
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
              placeholder="Nombre, email, documento…"
              autoComplete="off"
            />
          </label>
          <button type="submit" className="btn ghost">
            Buscar
          </button>
        </form>
        <label className="toolbar-field">
          Estado
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value as MemberStatus | 'ALL');
            }}
          >
            <option value="ALL">Todos</option>
            <option value="ACTIVE">Activos</option>
            <option value="SUSPENDED">Suspendidos</option>
            <option value="INACTIVE">Inactivos</option>
          </select>
        </label>
      </Panel>

      {loading ? <p className="muted">Cargando…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error ? (
        <Panel
          title="Listado"
          description={`${total} afiliado${total === 1 ? '' : 's'} · página ${page}`}
          className="table-wrap"
        >
          {rows.length === 0 ? (
            <p className="muted">No hay afiliados con ese filtro.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Documento</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name ?? '—'}</td>
                    <td>{m.email}</td>
                    <td>{m.document ?? '—'}</td>
                    <td>
                      <span className={`status-pill ${m.status.toLowerCase()}`}>
                        {formatMemberStatus(m.status)}
                      </span>
                    </td>
                    <td className="row-actions">
                      <Link href={`/afiliados/${m.id}`}>Ver</Link>
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
