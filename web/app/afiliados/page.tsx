'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import {
  DataTable,
  ListFilterField,
  ListSearchField,
  ListToolbar,
  listCountDescription,
} from '@/components/AdminList';
import { RequireStaff } from '@/components/RequireStaff';
import { StatusPill, memberStatusTone } from '@/components/StatusPill';
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

  return (
    <AdminShell
      title="Afiliados"
      actions={
        <Link href="/afiliados/nuevo" className="btn">
          + Nuevo
        </Link>
      }
    >
      <ListToolbar>
        <ListSearchField
          value={query}
          onChange={setQuery}
          onSubmit={() => {
            setPage(1);
            setAppliedQuery(query.trim());
          }}
          placeholder="Nombre, email, documento…"
        />
        <ListFilterField
          label="Estado"
          value={statusFilter}
          onChange={(v) => {
            setPage(1);
            setStatusFilter(v as MemberStatus | 'ALL');
          }}
        >
          <option value="ALL">Todos</option>
          <option value="ACTIVE">Activos</option>
          <option value="SUSPENDED">Suspendidos</option>
          <option value="INACTIVE">Inactivos</option>
        </ListFilterField>
      </ListToolbar>

      <DataTable
        description={listCountDescription(total, page, 'afiliado', 'afiliados')}
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText="No hay afiliados con ese filtro."
        page={page}
        hasMore={hasMore}
        onPageChange={setPage}
        header={
          <>
            <th>Nombre</th>
            <th>Email</th>
            <th>Documento</th>
            <th>Estado</th>
            <th />
          </>
        }
      >
        {rows.map((m) => (
          <tr key={m.id}>
            <td>{m.name ?? '—'}</td>
            <td>{m.email}</td>
            <td>{m.document ?? '—'}</td>
            <td>
              <StatusPill tone={memberStatusTone(m.status)}>
                {formatMemberStatus(m.status)}
              </StatusPill>
            </td>
            <td className="row-actions">
              <Link href={`/afiliados/${m.id}`}>Ver</Link>
            </td>
          </tr>
        ))}
      </DataTable>
    </AdminShell>
  );
}
