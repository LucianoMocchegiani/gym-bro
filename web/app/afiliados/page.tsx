'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { listMembers } from '@/lib/api/members';
import type { MemberDetail, MemberStatus } from '@/lib/api/types';
import { formatMemberStatus } from '@/lib/member-labels';

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
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'ALL'>(
    'ALL',
  );
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listMembers(
          statusFilter === 'ALL' ? undefined : statusFilter,
        );
        if (cancelled) {
          return;
        }
        setRows(data);
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
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return rows;
    }
    return rows.filter(
      (m) =>
        (m.name ?? '').toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.document ?? '').toLowerCase().includes(q) ||
        (m.phone ?? '').toLowerCase().includes(q),
    );
  }, [rows, query]);

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
        <label className="toolbar-field">
          Buscar
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre, email, documento…"
            autoComplete="off"
          />
        </label>
        <label className="toolbar-field">
          Estado
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as MemberStatus | 'ALL')
            }
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
          description={`${filtered.length} afiliado${filtered.length === 1 ? '' : 's'}`}
          className="table-wrap"
        >
          {filtered.length === 0 ? (
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
                {filtered.map((m) => (
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
        </Panel>
      ) : null}
    </AdminShell>
  );
}
