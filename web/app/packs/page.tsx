'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import {
  DataTable,
  ListFilterField,
  ListToolbar,
  listCountDescription,
} from '@/components/AdminList';
import { RequireStaff } from '@/components/RequireStaff';
import { StatusPill, activeTone } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import { listPacks } from '@/lib/api/packs';
import type { PackDetail } from '@/lib/api/packs';
import { formatMoney } from '@/lib/cash-labels';
import {
  formatBillingPeriod,
  formatPackKind,
} from '@/lib/catalog-labels';

const PAGE_SIZE = 20;

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
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'true' | 'false'>(
    'ALL',
  );
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await listPacks({
          active: activeFilter === 'ALL' ? undefined : activeFilter === 'true',
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
  }, [activeFilter, page]);

  return (
    <AdminShell
      title="Packs"
      actions={
        <Link href="/packs/nuevo" className="btn">
          + Nuevo
        </Link>
      }
    >
      <ListToolbar>
        <ListFilterField
          label="Activo"
          value={activeFilter}
          onChange={(v) => {
            setPage(1);
            setActiveFilter(v as 'ALL' | 'true' | 'false');
          }}
        >
          <option value="ALL">Todos</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </ListFilterField>
      </ListToolbar>

      <DataTable
        description={listCountDescription(total, page, 'pack', 'packs')}
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText="No hay packs con ese filtro."
        page={page}
        hasMore={hasMore}
        onPageChange={setPage}
        header={
          <>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Precio</th>
            <th>Periodo</th>
            <th>Componentes</th>
            <th>Estado</th>
            <th />
          </>
        }
      >
        {rows.map((p) => (
          <tr key={p.id}>
            <td>{p.name}</td>
            <td>{formatPackKind(p.kind)}</td>
            <td>{formatMoney(p.price)}</td>
            <td>{formatBillingPeriod(p.billingPeriod)}</td>
            <td>{p.components.length}</td>
            <td>
              <StatusPill tone={activeTone(p.active)}>
                {p.active ? 'Activo' : 'Inactivo'}
              </StatusPill>
            </td>
            <td className="row-actions">
              <Link href={`/packs/${p.id}`}>Editar</Link>
            </td>
          </tr>
        ))}
      </DataTable>
    </AdminShell>
  );
}
