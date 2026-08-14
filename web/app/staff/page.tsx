'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DataTable,
  ListSearchField,
  ListToolbar,
  listCountDescription,
} from '@/components/AdminList';
import { AdminModal } from '@/components/AdminModal';
import { AdminShell } from '@/components/AdminShell';
import { RequireStaff } from '@/components/RequireStaff';
import { StaffCreateForm } from '@/components/StaffCreateForm';
import { StaffCredentialPanel } from '@/components/StaffCredentialPanel';
import { StaffRolesPanel } from '@/components/StaffRolesPanel';
import {
  IconCredential,
  IconRoles,
  RowActions,
  RowIconButton,
} from '@/components/RowActions';
import { StatusPill, activeTone } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import { listStaff } from '@/lib/api/staff';
import type { StaffUserDetail } from '@/lib/api/staff';

const PAGE_SIZE = 20;

/**
 * Listado de staff: alta + Roles / Credencial en modal (CU-ROL-004).
 *
 * @remarks `+ Nuevo` → `?nuevo=1`; deep links `?roles=` / `?credencial=`.
 */
export default function StaffPage() {
  return (
    <RequireStaff>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <StaffInner />
      </Suspense>
    </RequireStaff>
  );
}

function StaffInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rolesId = searchParams.get('roles')?.trim() || null;
  const credencialId = searchParams.get('credencial')?.trim() || null;
  const createOpen =
    searchParams.get('nuevo') === '1' && !rolesId && !credencialId;

  const [rows, setRows] = useState<StaffUserDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashOk, setFlashOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listStaff({
        q: appliedQuery || undefined,
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
          : 'No se pudo cargar el staff',
      );
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function closeModals() {
    router.replace('/staff', { scroll: false });
  }

  function openCreate() {
    setFlashOk(null);
    router.replace('/staff?nuevo=1', { scroll: false });
  }

  function openRoles(id: string) {
    setFlashOk(null);
    router.replace(`/staff?roles=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  function openCredencial(id: string) {
    setFlashOk(null);
    router.replace(`/staff?credencial=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  return (
    <AdminShell
      title="Staff"
      actions={
        <button type="button" className="btn" onClick={openCreate}>
          + Nuevo
        </button>
      }
    >
      <ListToolbar>
        <ListSearchField
          value={query}
          onChange={setQuery}
          onSubmit={() => {
            setPage(1);
            setAppliedQuery(query.trim());
          }}
          placeholder="Nombre o email"
        />
      </ListToolbar>

      {flashOk ? <p className="ok-msg">{flashOk}</p> : null}

      <DataTable
        description={listCountDescription(total, page, 'usuario', 'usuarios')}
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText="No hay staff."
        page={page}
        hasMore={hasMore}
        onPageChange={setPage}
        header={
          <>
            <th>Nombre</th>
            <th>Email</th>
            <th>Roles</th>
            <th>Estado</th>
            <th />
          </>
        }
      >
        {rows.map((s) => (
          <tr key={s.id}>
            <td>{s.name ?? '—'}</td>
            <td>{s.email}</td>
            <td>
              {s.roles.length === 0
                ? '—'
                : s.roles.map((r) => r.name).join(', ')}
            </td>
            <td>
              <StatusPill tone={activeTone(s.active)}>
                {s.active ? 'Activo' : 'Inactivo'}
              </StatusPill>
            </td>
            <td>
              <RowActions>
                <RowIconButton
                  label="Roles asignados"
                  onClick={() => openRoles(s.id)}
                >
                  <IconRoles />
                </RowIconButton>
                <RowIconButton
                  label="Credencial de acceso"
                  onClick={() => openCredencial(s.id)}
                >
                  <IconCredential />
                </RowIconButton>
              </RowActions>
            </td>
          </tr>
        ))}
      </DataTable>

      <AdminModal
        open={createOpen}
        onClose={closeModals}
        title="Nuevo staff"
        description="Alta con roles iniciales opcionales."
        size="wide"
      >
        <StaffCreateForm
          onCancel={closeModals}
          onSuccess={(created) => {
            setFlashOk(`Staff creado: ${created.email}`);
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
        open={Boolean(rolesId)}
        onClose={closeModals}
        title="Roles asignados"
        description="Reemplaza el set completo al guardar."
        size="comfortable"
      >
        {rolesId ? (
          <StaffRolesPanel
            key={rolesId}
            staffId={rolesId}
            onSaved={(s) => {
              setFlashOk(`Roles actualizados: ${s.email}`);
              void load();
            }}
          />
        ) : null}
      </AdminModal>

      <AdminModal
        open={Boolean(credencialId)}
        onClose={closeModals}
        title="Credencial de acceso"
        description="Offer OID4VCI para molinete (sin fichaje)."
        size="comfortable"
      >
        {credencialId ? (
          <StaffCredentialPanel key={credencialId} staffId={credencialId} />
        ) : null}
      </AdminModal>
    </AdminShell>
  );
}
