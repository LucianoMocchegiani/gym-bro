'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DataTable,
  listCountDescription,
} from '@/components/AdminList';
import { AdminModal } from '@/components/AdminModal';
import { RequireSuper } from '@/components/RequireSuper';
import { PageSkeleton } from '@/components/Skeleton';
import { StatusPill, activeTone } from '@/components/StatusPill';
import { SuperShell } from '@/components/SuperShell';
import {
  IconEdit,
  RowActions,
  RowIconButton,
} from '@/components/RowActions';
import { TenantCreateForm } from '@/components/TenantCreateForm';
import { TenantEditPanel } from '@/components/TenantEditPanel';
import { ApiClientError } from '@/lib/api/client';
import { listTenants } from '@/lib/api/tenants';
import type { TenantDetail } from '@/lib/api/tenants';
import { tenantHostLabel, tenantOrigin } from '@/lib/tenant-host';

const PAGE_SIZE = 20;

/**
 * Listado de tenants (CU-ROL-001/002).
 *
 * @remarks `+ Crear` abre modal; `/super/tenants/nuevo` → `?nuevo=1`.
 */
export default function SuperTenantsPage() {
  return (
    <RequireSuper>
      <Suspense fallback={<PageSkeleton />}>
        <TenantsInner />
      </Suspense>
    </RequireSuper>
  );
}

function TenantsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<TenantDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(
    searchParams.get('nuevo') === '1',
  );
  const editarId = searchParams.get('editar')?.trim() || null;
  const [flashOk, setFlashOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listTenants({ page, pageSize: PAGE_SIZE });
      setRows(data.items);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudieron cargar tenants',
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  function openModal() {
    setFlashOk(null);
    setModalOpen(true);
    router.replace('/super/tenants?nuevo=1', { scroll: false });
  }

  function closeModal() {
    setModalOpen(false);
    router.replace('/super/tenants', { scroll: false });
  }

  function openEdit(id: string) {
    setFlashOk(null);
    router.replace(`/super/tenants?editar=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  return (
    <SuperShell
      title="Tenants"
      actions={
        <button type="button" className="btn" onClick={openModal}>
          + Crear
        </button>
      }
    >
      {flashOk ? <p className="ok-msg">{flashOk}</p> : null}

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
              <StatusPill tone={activeTone(t.status === 'ACTIVE')}>
                {t.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}
              </StatusPill>
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
            <td>
              <RowActions>
                <RowIconButton
                  label="Editar"
                  onClick={() => openEdit(t.id)}
                >
                  <IconEdit />
                </RowIconButton>
              </RowActions>
            </td>
          </tr>
        ))}
      </DataTable>

      <AdminModal
        open={modalOpen}
        onClose={closeModal}
        title="Nuevo tenant"
        description="Gym + owner Admin inicial."
      >
        <TenantCreateForm
          onCancel={closeModal}
          onSuccess={(created) => {
            setFlashOk(`Tenant creado: ${created.name}`);
            closeModal();
            if (page === 1) {
              void load();
            } else {
              setPage(1);
            }
          }}
        />
      </AdminModal>

      <AdminModal
        open={Boolean(editarId)}
        onClose={closeModal}
        title="Editar tenant"
        description="Datos del gym, slug y estado."
      >
        {editarId ? (
          <TenantEditPanel
            key={editarId}
            tenantId={editarId}
            onCancel={closeModal}
            onSaved={(updated) => {
              setFlashOk(`Tenant guardado: ${updated.name}`);
              closeModal();
              void load();
            }}
          />
        ) : null}
      </AdminModal>
    </SuperShell>
  );
}
