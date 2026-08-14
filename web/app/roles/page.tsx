'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DataTable,
  listCountDescription,
} from '@/components/AdminList';
import { AdminModal } from '@/components/AdminModal';
import { AdminShell } from '@/components/AdminShell';
import { RequireStaff } from '@/components/RequireStaff';
import { RoleCreateForm } from '@/components/RoleCreateForm';
import { RoleEditForm } from '@/components/RoleEditForm';
import {
  IconEdit,
  IconView,
  RowActions,
  RowIconButton,
} from '@/components/RowActions';
import { StatusPill } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import { listRoles } from '@/lib/api/roles';
import type { RoleDetail } from '@/lib/api/roles';

const PAGE_SIZE = 20;

/**
 * Listado de roles (CU-ROL-003): alta/edición en modal.
 */
export default function RolesPage() {
  return (
    <RequireStaff>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <RolesInner />
      </Suspense>
    </RequireStaff>
  );
}

function RolesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('editar')?.trim() || null;
  const createOpen = searchParams.get('nuevo') === '1' && !editId;

  const [rows, setRows] = useState<RoleDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashOk, setFlashOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listRoles({ page, pageSize: PAGE_SIZE });
      setRows(data.items);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudieron cargar roles',
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  function closeModals() {
    router.replace('/roles', { scroll: false });
  }

  function openCreate() {
    setFlashOk(null);
    router.replace('/roles?nuevo=1', { scroll: false });
  }

  function openEdit(id: string) {
    setFlashOk(null);
    router.replace(`/roles?editar=${encodeURIComponent(id)}`, {
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
      title="Roles"
      actions={
        <button type="button" className="btn" onClick={openCreate}>
          + Nuevo rol
        </button>
      }
    >
      {flashOk ? <p className="ok-msg">{flashOk}</p> : null}

      <DataTable
        description={listCountDescription(total, page, 'rol', 'roles')}
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText="No hay roles."
        page={page}
        hasMore={hasMore}
        onPageChange={setPage}
        header={
          <>
            <th>Nombre</th>
            <th>Slug</th>
            <th>Permisos</th>
            <th>Tipo</th>
            <th />
          </>
        }
      >
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.name}</td>
            <td>
              <code>{r.slug}</code>
            </td>
            <td>{r.permissionCodes.length}</td>
            <td>
              <StatusPill tone={r.isSystem ? 'warn' : 'ok'}>
                {r.isSystem ? 'Sistema' : 'Custom'}
              </StatusPill>
            </td>
            <td>
              <RowActions>
                <RowIconButton
                  label={r.slug === 'admin' ? 'Ver' : 'Editar'}
                  onClick={() => openEdit(r.id)}
                >
                  {r.slug === 'admin' ? <IconView /> : <IconEdit />}
                </RowIconButton>
              </RowActions>
            </td>
          </tr>
        ))}
      </DataTable>

      <AdminModal
        open={createOpen}
        onClose={closeModals}
        title="Nuevo rol"
        description="Rol custom con permisos del catálogo MVP."
        size="wide"
      >
        <RoleCreateForm
          onCancel={closeModals}
          onSuccess={(created) => afterMutation(`Rol creado: ${created.name}`)}
        />
      </AdminModal>

      <AdminModal
        open={Boolean(editId)}
        onClose={closeModals}
        title="Editar rol"
        size="wide"
      >
        {editId ? (
          <RoleEditForm
            key={editId}
            roleId={editId}
            onCancel={closeModals}
            onSuccess={(updated) =>
              afterMutation(`Rol guardado: ${updated.name}`)
            }
          />
        ) : null}
      </AdminModal>
    </AdminShell>
  );
}
