'use client';

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
import { PageSkeleton } from '@/components/Skeleton';
import { ServiceCreateForm } from '@/components/ServiceCreateForm';
import { ServiceEditForm } from '@/components/ServiceEditForm';
import {
  IconEdit,
  RowActions,
  RowIconButton,
} from '@/components/RowActions';
import { StatusPill, activeTone } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import { listServices } from '@/lib/api/services';
import type { ServiceDetail, ServiceType } from '@/lib/api/services';
import { formatServiceType } from '@/lib/catalog-labels';
import { formatMoney } from '@/lib/cash-labels';

const PAGE_SIZE = 20;

/**
 * Listado de servicios (CU-SER-001): alta/edición en modal.
 */
export default function ServiciosPage() {
  return (
    <RequireStaff>
      <Suspense fallback={<PageSkeleton />}>
        <ServiciosInner />
      </Suspense>
    </RequireStaff>
  );
}

function ServiciosInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('editar')?.trim() || null;
  const createOpen = searchParams.get('nuevo') === '1' && !editId;

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

  function closeModals() {
    router.replace('/servicios', { scroll: false });
  }

  function openCreate() {
    setFlashOk(null);
    router.replace('/servicios?nuevo=1', { scroll: false });
  }

  function openEdit(id: string) {
    setFlashOk(null);
    router.replace(`/servicios?editar=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  function afterMutation(message: string) {
    setFlashOk(message);
    closeModals();
    if (page === 1) {
      void load();
    } else {
      setPage(1);
    }
  }

  return (
    <AdminShell
      title="Servicios"
      actions={
        <button type="button" className="btn" onClick={openCreate}>
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
            <td>
              <RowActions>
                <RowIconButton
                  label="Editar"
                  onClick={() => openEdit(s.id)}
                >
                  <IconEdit />
                </RowIconButton>
              </RowActions>
            </td>
          </tr>
        ))}
      </DataTable>

      <AdminModal
        open={createOpen}
        onClose={closeModals}
        title="Nuevo servicio"
        description="Alta rápida del catálogo."
      >
        <ServiceCreateForm
          onCancel={closeModals}
          onSuccess={(created) =>
            afterMutation(`Servicio creado: ${created.name}`)
          }
        />
      </AdminModal>

      <AdminModal
        open={Boolean(editId)}
        onClose={closeModals}
        title="Editar servicio"
      >
        {editId ? (
          <ServiceEditForm
            key={editId}
            serviceId={editId}
            onCancel={closeModals}
            onSuccess={(updated) =>
              afterMutation(`Servicio guardado: ${updated.name}`)
            }
          />
        ) : null}
      </AdminModal>
    </AdminShell>
  );
}
