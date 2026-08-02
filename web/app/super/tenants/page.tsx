'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequireSuper } from '@/components/RequireSuper';
import { SuperShell } from '@/components/SuperShell';
import { Panel } from '@/components/AdminUi';
import { ApiClientError } from '@/lib/api/client';
import { listTenants } from '@/lib/api/tenants';
import type { TenantDetail } from '@/lib/api/tenants';
import { tenantHostLabel, tenantOrigin } from '@/lib/tenant-host';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listTenants();
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
  }, []);

  return (
    <SuperShell
      title="Tenants"
      actions={
        <Link href="/super/tenants/nuevo" className="btn">
          + Crear
        </Link>
      }
    >
      {loading ? <p className="muted">Cargando…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error ? (
        <Panel
          title="Listado"
          description={`${rows.length} gym${rows.length === 1 ? '' : 's'}`}
          className="table-wrap"
        >
          {rows.length === 0 ? (
            <p className="muted">No hay tenants.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Slug</th>
                  <th>Estado</th>
                  <th>Quark</th>
                  <th>Admin URL</th>
                  <th />
                </tr>
              </thead>
              <tbody>
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
                      <span
                        className={`status-pill ${t.quark?.status === 'READY' ? 'active' : 'inactive'}`}
                      >
                        {t.quark?.status === 'READY' ? 'Quark OK' : 'Quark —'}
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
              </tbody>
            </table>
          )}
        </Panel>
      ) : null}
    </SuperShell>
  );
}
