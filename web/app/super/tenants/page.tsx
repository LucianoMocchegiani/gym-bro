'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  DataTable,
  listCountDescription,
} from '@/components/AdminList';
import { RequireSuper } from '@/components/RequireSuper';
import { SuperShell } from '@/components/SuperShell';
import { ApiClientError } from '@/lib/api/client';
import { listTenants } from '@/lib/api/tenants';
import type { TenantDetail } from '@/lib/api/tenants';
import { tenantHostLabel, tenantOrigin } from '@/lib/tenant-host';

const PAGE_SIZE = 20;

/**
 * Listado de tenants (CU-ROL-001/002).
 */
export default function SuperTenantsPage() {
  return (
    <RequireSuper>
      <TenantsInner />
    </RequireSuper>
  );
}

function TenantsInner() {
  const [rows, setRows] = useState<TenantDetail[]>([]);
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
        const data = await listTenants({ page, pageSize: PAGE_SIZE });
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
            : 'No se pudieron cargar tenants',
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
    <SuperShell
      title="Tenants"
      actions={
        <Link href="/super/tenants/nuevo" className="btn">
          + Crear
        </Link>
      }
    >
      <DataTable
        description={listCountDescription(total, page, 'gym', 'gyms')}
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText="No hay tenants."
        page={page}
        hasMore={hasMore}
        onPageChange={setPage}
        header={
          <>
            <th>Nombre</th>
            <th>Slug</th>
            <th>Estado</th>
            <th>Admin URL</th>
            <th />
          </>
        }
      >
        {rows.map((t) => (
          <tr key={t.id}>
            <td>{t.name}</td>
            <td>
              <code>{t.slug}</code>
            </td>
            <td>
              <span
                className={`status-pill ${t.status === 'ACTIVE' ? 'active' : 'inactive'}`}
              >
                {t.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}
              </span>
            </td>
            <td>
              <a
                href={`${tenantOrigin(t.slug)}/login`}
                target="_blank"
                rel="noreferrer"
              >
                {tenantHostLabel(t.slug)}
              </a>
            </td>
            <td className="row-actions">
              <Link href={`/super/tenants/${t.id}`}>Editar</Link>
            </td>
          </tr>
        ))}
      </DataTable>
    </SuperShell>
  );
}
