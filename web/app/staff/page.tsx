'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DataTable,
  ListSearchField,
  ListToolbar,
  listCountDescription,
} from '@/components/AdminList';
import { AccessLinksPanel } from '@/components/AccessLinksPanel';
import { AdminModal } from '@/components/AdminModal';
import { AdminShell } from '@/components/AdminShell';
import { DeleteRowButton } from '@/components/DeleteRowButton';
import { RequireStaff } from '@/components/RequireStaff';
import { PageSkeleton } from '@/components/Skeleton';
import { StaffCreateForm } from '@/components/StaffCreateForm';
import { StaffCredentialPanel } from '@/components/StaffCredentialPanel';
import { StaffFichaPanel } from '@/components/StaffFichaPanel';
import { StaffRolesPanel } from '@/components/StaffRolesPanel';
import { PersonFolderModal } from '@/components/PersonFolderModal';
import {
  IconCredential,
  IconEdit,
  IconFolder,
  IconRoles,
  RowActions,
  RowIconButton,
} from '@/components/RowActions';
import { StatusPill, activeTone } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import { listStaff } from '@/lib/api/staff';
import type { StaffUserDetail } from '@/lib/api/staff';
import { deleteStaff } from '@/lib/api/staff';
import { useAccessDoor } from '@/lib/use-access-door';

const PAGE_SIZE = 20;

export default function StaffPage() {
  return (
    <RequireStaff>
      <Suspense fallback={<PageSkeleton />}>
        <StaffInner />
      </Suspense>
    </RequireStaff>
  );
}

function StaffInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fichaId = searchParams.get('ficha')?.trim() || null;
  const rolesId = searchParams.get('roles')?.trim() || null;
  const credencialId = searchParams.get('credencial')?.trim() || null;
  const carpetaId = searchParams.get('carpeta')?.trim() || null;
  const doorProvider = useAccessDoor();
  const createOpen =
    searchParams.get('nuevo') === '1' &&
    !fichaId &&
    !rolesId &&
    !credencialId &&
    !carpetaId;

  const [rows, setRows] = useState<StaffUserDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashOk, setFlashOk] = useState<string | null>(null);
  const [flashError, setFlashError] = useState<string | null>(null);

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
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => { cancelled = true; };
  }, [load]);

  function closeModals() {
    router.replace('/staff', { scroll: false });
  }

  function openCreate() {
    setFlashOk(null);
    router.replace('/staff?nuevo=1', { scroll: false });
  }

  function openFicha(id: string) {
    setFlashOk(null);
    router.replace(`/staff?ficha=${encodeURIComponent(id)}`, { scroll: false });
  }

  function openRoles(id: string) {
    setFlashOk(null);
    router.replace(`/staff?roles=${encodeURIComponent(id)}`, { scroll: false });
  }

  function openCredencial(id: string) {
    setFlashOk(null);
    router.replace(`/staff?credencial=${encodeURIComponent(id)}`, { scroll: false });
  }

  function openCarpeta(id: string) {
    setFlashOk(null);
    router.replace(`/staff?carpeta=${encodeURIComponent(id)}`, { scroll: false });
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
      {flashError ? <p className="err-msg">{flashError}</p> : null}

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
                  label="Editar staff"
                  onClick={() => openFicha(s.id)}
                >
                  <IconEdit />
                </RowIconButton>
                <RowIconButton
                  label="Roles asignados"
                  onClick={() => openRoles(s.id)}
                >
                  <IconRoles />
                </RowIconButton>
                <RowIconButton
                  label={
                    doorProvider === 'ZKTECO'
                      ? 'Acceso ZKTeco'
                      : 'Credencial de acceso'
                  }
                  onClick={() => openCredencial(s.id)}
                >
                  <IconCredential />
                </RowIconButton>
                <RowIconButton
                  label="Carpeta"
                  onClick={() => openCarpeta(s.id)}
                >
                  <IconFolder />
                </RowIconButton>
                <DeleteRowButton
                  dialogTitle={`Eliminar staff?`}
                  description={`Se eliminará en físico a ${s.name?.trim() || s.email} si no tiene actividad registrada (accesos, caja, devoluciones, etc.). Si la tiene, conviene desactivarlo.`}
                  onDelete={() => deleteStaff(s.id)}
                  onSuccess={() => {
                    setFlashOk(`Staff eliminado: ${s.name?.trim() || s.email}`);
                    void load();
                  }}
                  onError={(err) => setFlashError(err.message)}
                />
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
        open={Boolean(fichaId)}
        onClose={closeModals}
        title="Editar staff"
        description="Nombre, email y foto de perfil."
        size="comfortable"
      >
        {fichaId ? (
          <StaffFichaPanel
            key={fichaId}
            staffId={fichaId}
            onCancel={closeModals}
            onSaved={(s) => {
              setFlashOk(`Staff actualizado: ${s.email}`);
              void load();
            }}
          />
        ) : null}
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
            onCancel={closeModals}
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
        title={
          doorProvider === 'ZKTECO' ? 'Acceso ZKTeco' : 'Credencial de acceso'
        }
        description={
          doorProvider === 'ZKTECO'
            ? 'Número con el que se identifica en el aparato ZKTeco (sin fichaje).'
            : 'Offer OID4VCI para molinete (sin fichaje).'
        }
        size="comfortable"
      >
        {credencialId && doorProvider === 'ZKTECO' ? (
          <AccessLinksPanel
            key={credencialId}
            kind="staff"
            subjectId={credencialId}
          />
        ) : null}
        {credencialId && doorProvider === 'KUATIA' ? (
          <StaffCredentialPanel key={credencialId} staffId={credencialId} />
        ) : null}
      </AdminModal>

      <AdminModal
        open={Boolean(carpetaId)}
        onClose={closeModals}
        title="Carpeta"
        description="Notas y archivos (PDF o imagen). Las etiquetas las define el gym."
        size="comfortable"
      >
        {carpetaId ? (
          <PersonFolderModal key={carpetaId} kind="staff" ownerId={carpetaId} />
        ) : null}
      </AdminModal>
    </AdminShell>
  );
}
