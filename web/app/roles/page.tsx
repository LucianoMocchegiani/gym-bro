'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import {
  DataTable,
  listCountDescription,
} from '@/components/AdminList';
import { RequireStaff } from '@/components/RequireStaff';
import { StatusPill } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import { listRoles } from '@/lib/api/roles';
import type { RoleDetail } from '@/lib/api/roles';

const PAGE_SIZE = 20;

/**
 * Listado de roles del gym (CU-ROL-003).
 */
export default function RolesPage() {
  return (
    <RequireStaff>
      <RolesInner />
    </RequireStaff>
  );
}

function RolesInner() {
  const [rows, setRows] = useState<RoleDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await listRoles({ page, pageSize: PAGE_SIZE });
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
            : 'No se pudieron cargar roles',
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
  }, [page]);

  return (
    <AdminShell
      title="Roles"
      actions={
        <Link href="/roles/nuevo" className="btn">
          + Nuevo rol
        </Link>
      }
    >
      <DataTable
        description={listCountDescription(total, page, 'rol', 'roles')}
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText="No hay roles."
        page={page}
        hasMore={hasMore}
        onPageChange={setPage}
        header={
          <>
            <th>Nombre</th>
            <th>Slug</th>
            <th>Permisos</th>
            <th>Tipo</th>
            <th />
          </>
        }
      >
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.name}</td>
            <td>
              <code>{r.slug}</code>
            </td>
            <td>{r.permissionCodes.length}</td>
            <td>
              <StatusPill tone={r.isSystem ? 'warn' : 'ok'}>
                {r.isSystem ? 'Sistema' : 'Custom'}
              </StatusPill>
            </td>
            <td className="row-actions">
              <Link href={`/roles/${r.id}`}>
                {r.slug === 'admin' ? 'Ver' : 'Editar'}
              </Link>
            </td>
          </tr>
        ))}
      </DataTable>
    </AdminShell>
  );
}
