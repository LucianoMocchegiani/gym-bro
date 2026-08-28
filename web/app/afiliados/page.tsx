'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DataTable,
  ListFilterField,
  ListSearchField,
  ListToolbar,
  listCountDescription,
} from '@/components/AdminList';
import { AdminModal } from '@/components/AdminModal';
import { AdminShell } from '@/components/AdminShell';
import { DeleteRowButton } from '@/components/DeleteRowButton';
import { MemberAccountPanel } from '@/components/MemberAccountPanel';
import { MemberCreateForm } from '@/components/MemberCreateForm';
import { MemberCredentialPanel } from '@/components/MemberCredentialPanel';
import { MemberFichaPanel } from '@/components/MemberFichaPanel';
import { RequireStaff } from '@/components/RequireStaff';
import { PageSkeleton } from '@/components/Skeleton';
import {
  IconAccount,
  IconCredential,
  IconEdit,
  RowActions,
  RowIconButton,
} from '@/components/RowActions';
import { StatusPill, memberStatusTone } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import { deleteMember, listMembers } from '@/lib/api/members';
import type { MemberDetail, MemberStatus } from '@/lib/api/members';
import { formatMemberStatus } from '@/lib/member-labels';

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
  const fichaId = searchParams.get('ficha')?.trim() || null;
  const cuentaId = searchParams.get('cuenta')?.trim() || null;
  const credencialId = searchParams.get('credencial')?.trim() || null;
  const createOpen =
    searchParams.get('nuevo') === '1' && !fichaId && !cuentaId && !credencialId;

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
    router.replace('/afiliados', { scroll: false });
  }

  function openCreate() {
    setFlashOk(null);
    router.replace('/afiliados?nuevo=1', { scroll: false });
  }

  function openFicha(id: string) {
    setFlashOk(null);
    router.replace(`/afiliados?ficha=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  function openCuenta(id: string) {
    setFlashOk(null);
    router.replace(`/afiliados?cuenta=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  function openCredencial(id: string) {
    setFlashOk(null);
    router.replace(`/afiliados?credencial=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  return (
    <AdminShell
      title="Afiliados"
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
                  label="Credencial de acceso"
                  onClick={() => openCredencial(m.id)}
                >
                  <IconCredential />
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
        title="Credencial de acceso"
        description="Offer OID4VCI para molinete."
        size="comfortable"
      >
        {credencialId ? (
          <MemberCredentialPanel key={credencialId} memberId={credencialId} />
        ) : null}
      </AdminModal>
    </AdminShell>
  );
}
