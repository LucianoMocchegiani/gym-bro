'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { listPacks } from '@/lib/api/packs';
import type { PackDetail } from '@/lib/api/packs';
import { formatMoney } from '@/lib/cash-labels';
import {
  formatBillingPeriod,
  formatPackKind,
} from '@/lib/catalog-labels';

/**
 * Listado de packs del catálogo (CU-SER-002).
 */
export default function PacksPage() {
  return (
    <RequireStaff>
      <PacksInner />
    </RequireStaff>
  );
}

function PacksInner() {
  const [rows, setRows] = useState<PackDetail[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'true' | 'false'>(
    'ALL',
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await listPacks(
          activeFilter === 'ALL' ? undefined : activeFilter === 'true',
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
            : 'No se pudieron cargar packs',
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
  }, [activeFilter]);

  return (
    <AdminShell
      title="Packs"
      actions={
        <Link href="/packs/nuevo" className="btn">
          + Nuevo
        </Link>
      }
    >
      <Panel className="toolbar">
        <label className="toolbar-field">
          Activo
          <select
            value={activeFilter}
            onChange={(e) =>
              setActiveFilter(e.target.value as 'ALL' | 'true' | 'false')
            }
          >
            <option value="ALL">Todos</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </label>
      </Panel>

      {loading ? <p className="muted">Cargando…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error ? (
        <Panel
          title="Listado"
          description={`${rows.length} pack${rows.length === 1 ? '' : 's'}`}
          className="table-wrap"
        >
          {rows.length === 0 ? (
            <p className="muted">No hay packs con ese filtro.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Precio</th>
                  <th>Periodo</th>
                  <th>Componentes</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{formatPackKind(p.kind)}</td>
                    <td>{formatMoney(p.price)}</td>
                    <td>{formatBillingPeriod(p.billingPeriod)}</td>
                    <td>{p.components.length}</td>
                    <td>
                      <span
                        className={`status-pill ${p.active ? 'active' : 'inactive'}`}
                      >
                        {p.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="row-actions">
                      <Link href={`/packs/${p.id}`}>Editar</Link>
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
