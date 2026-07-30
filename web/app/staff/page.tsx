'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { listStaff } from '@/lib/api/staff';
import type { StaffUserDetail } from '@/lib/api/staff';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listStaff();
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
  }, []);

  return (
    <AdminShell
      title="Staff"
      actions={
        <Link href="/staff/nuevo" className="btn">
          + Nuevo
        </Link>
      }
    >
      {loading ? <p className="muted">Cargando…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error ? (
        <Panel
          title="Listado"
          description={`${rows.length} usuario${rows.length === 1 ? '' : 's'}`}
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
        </Panel>
      ) : null}
    </AdminShell>
  );
}
