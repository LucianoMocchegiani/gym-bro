'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { listRoles } from '@/lib/api/roles';
import type { RoleDetail } from '@/lib/api/roles';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listRoles();
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
  }, []);

  return (
    <AdminShell
      title="Roles"
      actions={
        <Link href="/roles/nuevo" className="btn">
          + Nuevo rol
        </Link>
      }
    >
      {loading ? <p className="muted">Cargando…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error ? (
        <Panel
          title="Listado"
          description={`${rows.length} rol${rows.length === 1 ? '' : 'es'}`}
          className="table-wrap"
        >
          {rows.length === 0 ? (
            <p className="muted">No hay roles.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Slug</th>
                  <th>Permisos</th>
                  <th>Tipo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>
                      <code>{r.slug}</code>
                    </td>
                    <td>{r.permissionCodes.length}</td>
                    <td>
                      <span
                        className={`status-pill ${r.isSystem ? 'suspended' : 'active'}`}
                      >
                        {r.isSystem ? 'Sistema' : 'Custom'}
                      </span>
                    </td>
                    <td className="row-actions">
                      <Link href={`/roles/${r.id}`}>
                        {r.slug === 'admin' ? 'Ver' : 'Editar'}
                      </Link>
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
