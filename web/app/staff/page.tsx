'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import {
  DataTable,
  ListSearchField,
  ListToolbar,
  listCountDescription,
} from '@/components/AdminList';
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

  return (
    <AdminShell
      title="Staff"
      actions={
        <Link href="/staff/nuevo" className="btn">
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
          placeholder="Nombre o email"
        />
      </ListToolbar>

      <DataTable
        description={listCountDescription(total, page, 'usuario', 'usuarios')}
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText="No hay staff."
        page={page}
        hasMore={hasMore}
        onPageChange={setPage}
        header={
          <>
            <th>Nombre</th>
            <th>Email</th>
            <th>Roles</th>
            <th>Estado</th>
            <th />
          </>
        }
      >
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
      </DataTable>
    </AdminShell>
  );
}
