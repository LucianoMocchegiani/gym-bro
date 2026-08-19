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
import { PackCreateForm } from '@/components/PackCreateForm';
import { PackEditPanel } from '@/components/PackEditPanel';
import { RequireStaff } from '@/components/RequireStaff';
import {
  IconEdit,
  RowActions,
  RowIconButton,
} from '@/components/RowActions';
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
 * Listado de packs: alta + editar en modal (CU-SER-002).
 */
export default function PacksPage() {
  return (
    <RequireStaff>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
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
    </AdminShell>
  );
}
