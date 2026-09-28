'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DataTable,
  listCountDescription,
} from '@/components/AdminList';
import { AdminShell } from '@/components/AdminShell';
import { AdminModal } from '@/components/AdminModal';
import { RequireStaff } from '@/components/RequireStaff';
import { PageSkeleton } from '@/components/Skeleton';
import { StatusPill, activeTone } from '@/components/StatusPill';
import { ListToolbar } from '@/components/AdminList';
import {
  IconEdit,
  IconView,
  RowActions,
  RowIconButton,
} from '@/components/RowActions';
import { TenantCreateForm } from '@/components/TenantCreateForm';
import { TenantEditPanel } from '@/components/TenantEditPanel';
import { ImpersonateTenantPanel } from '@/components/ImpersonateTenantPanel';
import { ApiClientError } from '@/lib/api/client';
import { listTenants } from '@/lib/api/tenants';
import type { TenantDetail } from '@/lib/api/tenants';
import { tenantHostLabel, tenantOrigin } from '@/lib/tenant-host';

const PAGE_SIZE = 20;

/**
 * Gestión de gyms del tenant `admin` (plataforma).
 *
 * @remarks Reemplaza el antiguo `/super/tenants`. Solo accesible con el slug
 * `admin`: un gym normal no tiene este módulo en la nav ni permisos de
 * plataforma, así que la API responde 403.
 */
export default function AdminTenantsPage() {
  return (
    <RequireStaff>
      <Suspense fallback={<PageSkeleton />}>
        <TenantsInner />
      </Suspense>
    </RequireStaff>
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
  const impersonateId = searchParams.get('impersonate')?.trim() || null;
  const detalleId = searchParams.get('detalle')?.trim() || null;
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
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  function closeModal() {
    setModalOpen(false);
    router.replace('/tenants', { scroll: false });
  }

  function navigate(param: string, id: string) {
    setFlashOk(null);
    router.replace(`/tenants?${param}=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  const detalle = rows.find((r) => r.id === detalleId) ?? null;
  const impersonateTarget = rows.find((r) => r.id === impersonateId) ?? null;

  return (
    <AdminShell title="Gyms" subtitle="Alta, edición y acceso a cada tenant.">
      <ListToolbar hint="Accedé a un gym para operarlo con su propia sesión.">
        <button
          type="button"
          className="btn"
          onClick={() => {
            setFlashOk(null);
            setModalOpen(true);
            router.replace('/tenants?nuevo=1', { scroll: false });
          }}
        >
          + Crear
        </button>
      </ListToolbar>
      {flashOk ? <p className="ok-msg">{flashOk}</p> : null}

      <DataTable
        title="Tenants"
        description={listCountDescription(total, page, 'gym', 'gyms')}
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText="No hay gyms."
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
                  label="Ver detalle"
                  onClick={() => navigate('detalle', t.id)}
                >
                  <IconView />
                </RowIconButton>
                <RowIconButton
                  label="Entrar como gym"
                  onClick={() => navigate('impersonate', t.id)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </RowIconButton>
                <RowIconButton
                  label="Editar"
                  onClick={() => navigate('editar', t.id)}
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
        title="Nuevo gym"
        description="Gym + owner Admin inicial."
      >
        <TenantCreateForm
          onCancel={closeModal}
          onSuccess={(created) => {
            setFlashOk(`Gym creado: ${created.name}`);
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
        title="Editar gym"
        description="Datos, slug y estado."
      >
        {editarId ? (
          <TenantEditPanel
            key={editarId}
            tenantId={editarId}
            onCancel={closeModal}
            onSaved={(updated) => {
              setFlashOk(`Gym guardado: ${updated.name}`);
              closeModal();
              void load();
            }}
            onDeleted={() => {
              setFlashOk('Gym eliminado (cascada total).');
              closeModal();
              void load();
            }}
          />
        ) : null}
      </AdminModal>

      <AdminModal
        open={Boolean(detalle)}
        onClose={closeModal}
        title={detalle?.name ?? ''}
        description={detalle ? `${detalle.slug} · ${detalle.status}` : ''}
      >
        {detalle ? (
          <ul className="plain-list">
            <li>
              <strong>Slug:</strong> <code>{detalle.slug}</code>
            </li>
            <li>
              <strong>Estado:</strong> {detalle.status}
            </li>
            <li>
              <strong>Sede:</strong> {detalle.defaultBranch?.name ?? '—'}
            </li>
            <li>
              <strong>Owner:</strong> {detalle.owner?.email ?? '—'}
            </li>
            <li>
              <strong>Alta:</strong>{' '}
              {new Date(detalle.createdAt).toLocaleDateString('es-AR')}
            </li>
          </ul>
        ) : null}
      </AdminModal>

      {impersonateTarget ? (
        <ImpersonateTenantPanel
          key={impersonateTarget.id}
          tenant={{
            id: impersonateTarget.id,
            name: impersonateTarget.name,
            slug: impersonateTarget.slug,
            status: impersonateTarget.status,
            memberCount: 0,
          }}
          onClose={closeModal}
        />
      ) : null}
    </AdminShell>
  );
}
