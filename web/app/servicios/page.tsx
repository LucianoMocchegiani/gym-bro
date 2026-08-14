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
import { listServices } from '@/lib/api/services';
import type { ServiceDetail, ServiceType } from '@/lib/api/services';
import { formatServiceType } from '@/lib/catalog-labels';
import { formatMoney } from '@/lib/cash-labels';

const PAGE_SIZE = 20;

/**
 * Listado de servicios del catálogo (CU-SER-001).
 */
export default function ServiciosPage() {
  return (
    <RequireStaff>
      <ServiciosInner />
    </RequireStaff>
  );
}

function ServiciosInner() {
  const [rows, setRows] = useState<ServiceDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ServiceType | 'ALL'>('ALL');
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
        const data = await listServices({
          type: typeFilter === 'ALL' ? undefined : typeFilter,
          active:
            activeFilter === 'ALL' ? undefined : activeFilter === 'true',
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
            : 'No se pudieron cargar servicios',
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
  }, [typeFilter, activeFilter, page]);

  return (
    <AdminShell
      title="Servicios"
      actions={
        <Link href="/servicios/nuevo" className="btn">
          + Nuevo
        </Link>
      }
    >
      <ListToolbar>
        <ListFilterField
          label="Tipo"
          value={typeFilter}
          onChange={(v) => {
            setPage(1);
            setTypeFilter(v as ServiceType | 'ALL');
          }}
        >
          <option value="ALL">Todos</option>
          <option value="ACCESO_LIBRE">Acceso libre</option>
          <option value="POR_SESIONES">Por sesiones</option>
        </ListFilterField>
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
        description={listCountDescription(total, page, 'servicio', 'servicios')}
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText="No hay servicios con ese filtro."
        page={page}
        hasMore={hasMore}
        onPageChange={setPage}
        header={
          <>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Drop-in</th>
            <th>Estado</th>
            <th />
          </>
        }
      >
        {rows.map((s) => (
          <tr key={s.id}>
            <td>{s.name}</td>
            <td>{formatServiceType(s.type)}</td>
            <td>
              {s.dropInPrice != null ? formatMoney(s.dropInPrice) : '—'}
            </td>
            <td>
              <StatusPill tone={activeTone(s.active)}>
                {s.active ? 'Activo' : 'Inactivo'}
              </StatusPill>
            </td>
            <td className="row-actions">
              <Link href={`/servicios/${s.id}`}>Editar</Link>
            </td>
          </tr>
        ))}
      </DataTable>
    </AdminShell>
  );
}
