'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DataTable,
  ListFilterField,
  ListToolbar,
  listCountDescription,
} from '@/components/AdminList';
import { AdminModal } from '@/components/AdminModal';
import { AdminShell } from '@/components/AdminShell';
import { RequireStaff } from '@/components/RequireStaff';
import { ServiceCreateForm } from '@/components/ServiceCreateForm';
import { StatusPill, activeTone } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import { listServices } from '@/lib/api/services';
import type { ServiceDetail, ServiceType } from '@/lib/api/services';
import { formatServiceType } from '@/lib/catalog-labels';
import { formatMoney } from '@/lib/cash-labels';

const PAGE_SIZE = 20;

/**
 * Listado de servicios del catálogo (CU-SER-001).
 *
 * @remarks `+ Nuevo` abre modal; `/servicios/nuevo` redirige a `?nuevo=1`.
 */
export default function ServiciosPage() {
  return (
    <RequireStaff>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <ServiciosInner />
      </Suspense>
    </RequireStaff>
  );
}

function ServiciosInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [modalOpen, setModalOpen] = useState(
    searchParams.get('nuevo') === '1',
  );
  const [flashOk, setFlashOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listServices({
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        active: activeFilter === 'ALL' ? undefined : activeFilter === 'true',
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(data.items);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudieron cargar servicios',
      );
    } finally {
      setLoading(false);
    }
  }, [typeFilter, activeFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function openModal() {
    setFlashOk(null);
    setModalOpen(true);
    router.replace('/servicios?nuevo=1', { scroll: false });
  }

  function closeModal() {
    setModalOpen(false);
    router.replace('/servicios', { scroll: false });
  }

  return (
    <AdminShell
      title="Servicios"
      actions={
        <button type="button" className="btn" onClick={openModal}>
          + Nuevo
        </button>
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

      {flashOk ? <p className="ok-msg">{flashOk}</p> : null}

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

      <AdminModal
        open={modalOpen}
        onClose={closeModal}
        title="Nuevo servicio"
        description="Alta rápida del catálogo. Después podés editarlo desde la fila."
      >
        <ServiceCreateForm
          onCancel={closeModal}
          onSuccess={(created) => {
            setFlashOk(`Servicio creado: ${created.name}`);
            closeModal();
            if (page === 1) {
              void load();
            } else {
              setPage(1);
            }
          }}
        />
      </AdminModal>
    </AdminShell>
  );
}
