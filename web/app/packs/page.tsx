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
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DeleteRowButton } from '@/components/DeleteRowButton';
import { PackCreateForm } from '@/components/PackCreateForm';
import { PackEditPanel } from '@/components/PackEditPanel';
import { RequireStaff } from '@/components/RequireStaff';
import { PageSkeleton } from '@/components/Skeleton';
import {
  IconEdit,
  RowActions,
  RowIconButton,
} from '@/components/RowActions';
import { StatusPill, activeTone } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import { deletePack, listPacks, type DeletePackResult } from '@/lib/api/packs';
import type { PackDetail } from '@/lib/api/packs';
import { formatMoney } from '@/lib/cash-labels';
import {
  formatBillingPeriod,
  formatPackKind,
} from '@/lib/catalog-labels';

const PAGE_SIZE = 20;

/**
 * Listado de packs: alta + editar en modal (CU-SER-002).
 */
export default function PacksPage() {
  return (
    <RequireStaff>
      <Suspense fallback={<PageSkeleton />}>
        <PacksInner />
      </Suspense>
    </RequireStaff>
  );
}

function PacksInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('editar')?.trim() || null;
  const createOpen = searchParams.get('nuevo') === '1' && !editId;

  const [rows, setRows] = useState<PackDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'true' | 'false'>(
    'ALL',
  );
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashOk, setFlashOk] = useState<string | null>(null);
  const [flashError, setFlashError] = useState<string | null>(null);
  const [packWarn, setPackWarn] = useState<{
    pack: PackDetail;
    totalContracts: number;
    activeContracts: number;
  } | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPacks({
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
          : 'No se pudieron cargar packs',
      );
    } finally {
      setLoading(false);
    }
  }, [activeFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function closeModals() {
    router.replace('/packs', { scroll: false });
  }

  function openCreate() {
    setFlashOk(null);
    router.replace('/packs?nuevo=1', { scroll: false });
  }

  function openEdit(id: string) {
    setFlashOk(null);
    router.replace(`/packs?editar=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  async function confirmDeactivate() {
    if (!packWarn) {
      return;
    }
    setDeactivating(true);
    try {
      await deletePack(packWarn.pack.id, true);
      setFlashOk(
        `Pack dado de baja: dejará de funcionar el mes siguiente.`,
      );
      setPackWarn(null);
      void load();
    } catch (err) {
      setFlashError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo dar de baja el pack',
      );
      setPackWarn(null);
    } finally {
      setDeactivating(false);
    }
  }

  return (
    <AdminShell
      title="Packs"
      actions={
        <button type="button" className="btn" onClick={openCreate}>
          + Nuevo
        </button>
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

      {flashOk ? <p className="ok-msg">{flashOk}</p> : null}
      {flashError ? <p className="err-msg">{flashError}</p> : null}

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
            <td>
              <RowActions>
                <RowIconButton
                  label="Editar"
                  onClick={() => openEdit(p.id)}
                >
                  <IconEdit />
                </RowIconButton>
                <DeleteRowButton
                  dialogTitle={`Eliminar pack ${p.name}?`}
                  description="Si tiene contrataciones no se eliminará en físico: quedará dado de baja."
                  onDelete={() => deletePack(p.id)}
                  onSuccess={(res) => {
                    const r = res as DeletePackResult;
                    if (r.deactivated) {
                      setFlashOk(
                        'Pack dado de baja: dejará de funcionar el mes siguiente.',
                      );
                    } else {
                      setFlashOk(`Pack eliminado: ${p.name}`);
                    }
                    void load();
                  }}
                  onError={(err) => {
                    if (
                      err.status === 409 &&
                      (err.body as { code?: string } | null)?.code ===
                        'PACK_HAS_CONTRACTS'
                    ) {
                      const body = (err.body ?? {}) as {
                        totalContracts?: number;
                        activeContracts?: number;
                      };
                      setPackWarn({
                        pack: p,
                        totalContracts: body.totalContracts ?? 0,
                        activeContracts: body.activeContracts ?? 0,
                      });
                    } else {
                      setFlashError(err.message);
                    }
                  }}
                />
              </RowActions>
            </td>
          </tr>
        ))}
      </DataTable>

      <AdminModal
        open={createOpen}
        onClose={closeModals}
        title="Nuevo pack"
        description="Datos, componentes y sync Kuatia al crear."
        size="comfortable"
      >
        <PackCreateForm
          onCancel={closeModals}
          onSuccess={(created) => {
            setFlashOk(`Pack creado: ${created.name}`);
            closeModals();
            if (page === 1) {
              void load();
            } else {
              setPage(1);
            }
          }}
        />
      </AdminModal>

      <AdminModal
        open={Boolean(editId)}
        onClose={closeModals}
        title="Editar pack"
        description="Datos, componentes y estado Kuatia."
        size="comfortable"
      >
        {editId ? (
          <PackEditPanel
            key={editId}
            packId={editId}
            onCancel={closeModals}
            onSaved={(p) => {
              setFlashOk(`Pack actualizado: ${p.name}`);
              void load();
            }}
          />
        ) : null}
      </AdminModal>

      <ConfirmDialog
        open={Boolean(packWarn)}
        title={`Dar de baja el pack ${packWarn?.pack.name ?? ''}?`}
        description={
          <>
            Este pack tiene {packWarn?.totalContracts ?? 0} contratación(es)
            {packWarn && packWarn.activeContracts > 0
              ? ` (${packWarn.activeContracts} activas)`
              : ''}{' '}
            y no se puede eliminar en físico. Al confirmar quedará{' '}
            <strong>dado de baja</strong> y dejará de funcionar el mes
            siguiente; las contrataciones vigentes siguen hasta que termine su
            período.
          </>
        }
        tone="danger"
        confirmLabel="Dar de baja"
        confirmWord="ELIMINAR"
        busy={deactivating}
        onConfirm={confirmDeactivate}
        onCancel={() => setPackWarn(null)}
      />
    </AdminShell>
  );
}
