'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DataTable,
  ListFilterField,
  ListSearchField,
  ListToolbar,
  listCountDescription,
} from '@/components/AdminList';
import { AccessLinksPanel } from '@/components/AccessLinksPanel';
import { AdminModal } from '@/components/AdminModal';
import { AdminShell } from '@/components/AdminShell';
import { DeleteRowButton } from '@/components/DeleteRowButton';
import { MemberAccountPanel } from '@/components/MemberAccountPanel';
import { MemberCreateForm } from '@/components/MemberCreateForm';
import { MemberCredentialPanel } from '@/components/MemberCredentialPanel';
import { MemberFichaPanel } from '@/components/MemberFichaPanel';
import { PersonFolderModal } from '@/components/PersonFolderModal';
import { RequireStaff } from '@/components/RequireStaff';
import { PageSkeleton } from '@/components/Skeleton';
import {
  IconAccount,
  IconCredential,
  IconEdit,
  IconFolder,
  RowActions,
  RowIconButton,
} from '@/components/RowActions';
import { StatusPill, memberStatusTone } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import { deleteMember, listMembers } from '@/lib/api/members';
import type { MemberDetail, MemberStatus } from '@/lib/api/members';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatMemberStatus } from '@/lib/member-labels';
import { hasAllPermissions } from '@/lib/nav-permissions';
import { useAccessDoor } from '@/lib/use-access-door';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: MemberStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'SUSPENDED', label: 'Suspendido' },
  { value: 'INACTIVE', label: 'Inactivo' },
];

export default function AfiliadosPage() {
  return (
    <RequireStaff>
      <Suspense fallback={<PageSkeleton />}>
        <AfiliadosInner />
      </Suspense>
    </RequireStaff>
  );
}

function AfiliadosInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const canImport = hasAllPermissions(session?.permissionCodes, [
    'members.import',
    'members.write',
  ]);
  const fichaId = searchParams.get('ficha')?.trim() || null;
  const cuentaId = searchParams.get('cuenta')?.trim() || null;
  const credencialId = searchParams.get('credencial')?.trim() || null;
  const carpetaId = searchParams.get('carpeta')?.trim() || null;
  const doorProvider = useAccessDoor();
  const createOpen =
    searchParams.get('nuevo') === '1' &&
    !fichaId &&
    !cuentaId &&
    !credencialId &&
    !carpetaId;

  const [rows, setRows] = useState<MemberDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [status, setStatus] = useState<MemberStatus | ''>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashOk, setFlashOk] = useState<string | null>(null);
  const [flashError, setFlashError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMembers({
        q: appliedQuery || undefined,
        status: (status as MemberStatus) || undefined,
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
          : 'No se pudieron cargar los afiliados',
      );
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, status, page]);

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

  function closeModals() {
    router.replace('/dashboard/afiliados', { scroll: false });
  }

  function openCreate() {
    setFlashOk(null);
    router.replace('/dashboard/afiliados?nuevo=1', { scroll: false });
  }

  function openFicha(id: string) {
    setFlashOk(null);
    router.replace(`/dashboard/afiliados?ficha=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  function openCuenta(id: string) {
    setFlashOk(null);
    router.replace(`/dashboard/afiliados?cuenta=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  function openCredencial(id: string) {
    setFlashOk(null);
    router.replace(`/dashboard/afiliados?credencial=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  function openCarpeta(id: string) {
    setFlashOk(null);
    router.replace(`/dashboard/afiliados?carpeta=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  return (
    <AdminShell
      title="Afiliados"
      actions={
        <div className="page-head-actions">
          {canImport ? (
            <Link href="/dashboard/afiliados/importar" className="btn ghost">
              Importar
            </Link>
          ) : null}
          <button type="button" className="btn" onClick={openCreate}>
            + Nuevo
          </button>
        </div>
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
          placeholder="Nombre, email o doc"
        />
        <ListFilterField
          label="Estado"
          value={status}
          onChange={(v) => {
            setStatus(v as MemberStatus | '');
            setPage(1);
          }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </ListFilterField>
      </ListToolbar>

      {flashOk ? <p className="ok-msg">{flashOk}</p> : null}
      {flashError ? <p className="err-msg">{flashError}</p> : null}

      <DataTable
        description={listCountDescription(total, page, 'afiliado', 'afiliados')}
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText="No hay afiliados con ese filtro."
        page={page}
        hasMore={hasMore}
        onPageChange={setPage}
        header={
          <>
            <th>Nombre</th>
            <th>Email</th>
            <th>Documento</th>
            <th>Estado</th>
            <th />
          </>
        }
      >
        {rows.map((m) => (
          <tr key={m.id}>
            <td>{m.name ?? '—'}</td>
            <td>{m.email}</td>
            <td>{m.document ?? '—'}</td>
            <td>
              <StatusPill tone={memberStatusTone(m.status)}>
                {formatMemberStatus(m.status)}
              </StatusPill>
            </td>
            <td>
              <RowActions>
                <RowIconButton
                  label="Ficha"
                  onClick={() => openFicha(m.id)}
                >
                  <IconEdit />
                </RowIconButton>
                <RowIconButton
                  label="Estado de cuenta"
                  onClick={() => openCuenta(m.id)}
                >
                  <IconAccount />
                </RowIconButton>
                <RowIconButton
                  label={
                    doorProvider === 'ZKTECO'
                      ? 'Acceso ZKTeco'
                      : 'Credencial de acceso'
                  }
                  onClick={() => openCredencial(m.id)}
                >
                  <IconCredential />
                </RowIconButton>
                <RowIconButton
                  label="Carpeta"
                  onClick={() => openCarpeta(m.id)}
                >
                  <IconFolder />
                </RowIconButton>
                <DeleteRowButton
                  dialogTitle={`Eliminar afiliado?`}
                  description={`Se eliminará en físico a ${m.name?.trim() || m.email} si no tiene historial. Con pagos, contratos, reservas u otra actividad no se podrá: conviene dar de baja o suspender.`}
                  onDelete={() => deleteMember(m.id)}
                  onSuccess={() => {
                    setFlashOk(
                      `Afiliado eliminado: ${m.name?.trim() || m.email}`,
                    );
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
        title="Nuevo afiliado"
        description="Alta rápida."
      >
        <MemberCreateForm
          onCancel={closeModals}
          onSuccess={(created) => {
            setFlashOk(
              `Afiliado creado: ${created.name?.trim() || created.email}`,
            );
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
        title="Ficha del afiliado"
        description="Datos y estado ACTIVE / SUSPENDED / INACTIVE."
        size="comfortable"
      >
        {fichaId ? (
          <MemberFichaPanel
            key={fichaId}
            memberId={fichaId}
            onCancel={closeModals}
            onSaved={(m) => {
              setFlashOk(
                `Ficha actualizada: ${m.name?.trim() || m.email}`,
              );
              void load();
            }}
          />
        ) : null}
      </AdminModal>

      <AdminModal
        open={Boolean(cuentaId)}
        onClose={closeModals}
        title="Estado de cuenta"
        description="Contrato activo y reservas."
        size="wide"
      >
        {cuentaId ? (
          <MemberAccountPanel key={cuentaId} memberId={cuentaId} />
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
            ? 'Número con el que se identifica en el aparato ZKTeco.'
            : 'Offer OID4VCI para molinete.'
        }
        size="comfortable"
      >
        {credencialId && doorProvider === 'ZKTECO' ? (
          <AccessLinksPanel
            key={credencialId}
            kind="member"
            subjectId={credencialId}
          />
        ) : null}
        {credencialId && doorProvider === 'KUATIA' ? (
          <MemberCredentialPanel key={credencialId} memberId={credencialId} />
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
          <PersonFolderModal key={carpetaId} kind="member" ownerId={carpetaId} />
        ) : null}
      </AdminModal>
    </AdminShell>
  );
}
