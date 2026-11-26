'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DataTable,
  listCountDescription,
} from '@/components/AdminList';
import { AdminShell } from '@/components/AdminShell';
import { AdminModal } from '@/components/AdminModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
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
import {
  cancelPlatformTenantPlan,
  listTenants,
} from '@/lib/api/tenants';
import type { TenantDetail } from '@/lib/api/tenants';
import { tenantHostLabel, tenantOrigin } from '@/lib/tenant-host';

const PAGE_SIZE = 20;

/**
 * Gestión de organizaciones del tenant `admin` (plataforma).
 *
 * @remarks Reemplaza el antiguo `/super/tenants`. Solo accesible con el slug
 * `admin`: una organización normal no tiene este módulo en la nav ni permisos de
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
  const [planCancelTarget, setPlanCancelTarget] =
    useState<TenantDetail | null>(null);
  const [planCancelBusy, setPlanCancelBusy] = useState(false);
  const [planCancelError, setPlanCancelError] = useState<string | null>(null);

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
          : 'No se pudieron cargar las organizaciones',
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
    router.replace('/dashboard/tenants', { scroll: false });
  }

  function navigate(param: string, id: string) {
    setFlashOk(null);
    router.replace(`/dashboard/tenants?${param}=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  async function cancelPlatformPlan() {
    if (!planCancelTarget) return;
    setPlanCancelBusy(true);
    setPlanCancelError(null);
    try {
      await cancelPlatformTenantPlan(planCancelTarget.id, planCancelTarget.slug);
      setFlashOk(`Plan de ${planCancelTarget.name} dado de baja inmediatamente.`);
      setPlanCancelTarget(null);
    } catch (err) {
      setPlanCancelError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo dar de baja el plan',
      );
    } finally {
      setPlanCancelBusy(false);
    }
  }

  const detalle = rows.find((r) => r.id === detalleId) ?? null;
  const impersonateTarget = rows.find((r) => r.id === impersonateId) ?? null;

  return (
    <AdminShell title="Organizaciones" subtitle="Alta, edición y acceso a cada organización.">
      <ListToolbar hint="Accedé a una organización para operarla con su propia sesión.">
        <button
          type="button"
          className="btn"
          onClick={() => {
            setFlashOk(null);
            setModalOpen(true);
            router.replace('/dashboard/tenants?nuevo=1', { scroll: false });
          }}
        >
          + Crear
        </button>
      </ListToolbar>
      {flashOk ? <p className="ok-msg">{flashOk}</p> : null}

      <DataTable
        title="Organizaciones"
        description={listCountDescription(total, page, 'organización', 'organizaciones')}
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText="No hay organizaciones."
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
                  label="Entrar a la organización"
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
        title="Nueva organización"
        description="Organización + cuenta Admin inicial."
      >
        <TenantCreateForm
          onCancel={closeModal}
          onSuccess={(created) => {
            setFlashOk(`Organización creada: ${created.name}`);
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
        title="Editar organización"
        description="Datos, slug y estado."
      >
        {editarId ? (
          <TenantEditPanel
            key={editarId}
            tenantId={editarId}
            onCancel={closeModal}
            onSaved={(updated) => {
              setFlashOk(`Organización guardada: ${updated.name}`);
              closeModal();
              void load();
            }}
            onDeleted={() => {
              setFlashOk('Organización eliminada.');
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
          <>
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
            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  setPlanCancelError(null);
                  setPlanCancelTarget(detalle);
                }}
              >
                Dar de baja el plan ahora
              </button>
            </div>
          </>
        ) : null}
      </AdminModal>

      <ConfirmDialog
        open={Boolean(planCancelTarget)}
        title="Dar de baja el plan ahora"
        description={
          planCancelTarget
            ? `Se cancelará inmediatamente el contrato Faciliter de ${planCancelTarget.name} (${planCancelTarget.slug}) y el débito automático asociado, si existe. Perderá acceso al plan y todos los créditos restantes se pondrán en cero. No implica reintegro. Un cobro que Mercado Pago ya esté procesando podría acreditarse igualmente.`
            : undefined
        }
        confirmLabel="Dar de baja ahora"
        tone="danger"
        confirmWord="BAJA INMEDIATA"
        confirmWord2={planCancelTarget?.slug}
        busy={planCancelBusy}
        onConfirm={() => void cancelPlatformPlan()}
        onCancel={() => {
          if (!planCancelBusy) setPlanCancelTarget(null);
        }}
      >
        {planCancelError ? <p className="error">{planCancelError}</p> : null}
      </ConfirmDialog>

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
