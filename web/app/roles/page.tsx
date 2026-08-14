'use client';

import Link from 'next/link';
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
import { StatusPill } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import { listRoles } from '@/lib/api/roles';
import type { RoleDetail } from '@/lib/api/roles';

const PAGE_SIZE = 20;

/**
 * Listado de roles del gym (CU-ROL-003).
 *
 * @remarks `+ Nuevo rol` abre modal; `/roles/nuevo` redirige a `?nuevo=1`.
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
  const [rows, setRows] = useState<RoleDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
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

  function openModal() {
    setFlashOk(null);
    setModalOpen(true);
    router.replace('/roles?nuevo=1', { scroll: false });
  }

  function closeModal() {
    setModalOpen(false);
    router.replace('/roles', { scroll: false });
  }

  return (
    <AdminShell
      title="Roles"
      actions={
        <button type="button" className="btn" onClick={openModal}>
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
            <td className="row-actions">
              <Link href={`/roles/${r.id}`}>
                {r.slug === 'admin' ? 'Ver' : 'Editar'}
              </Link>
            </td>
          </tr>
        ))}
      </DataTable>

      <AdminModal
        open={modalOpen}
        onClose={closeModal}
        title="Nuevo rol"
        description="Rol custom con permisos del catálogo MVP."
        wide
      >
        <RoleCreateForm
          onCancel={closeModal}
          onSuccess={(created) => {
            setFlashOk(`Rol creado: ${created.name}`);
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
