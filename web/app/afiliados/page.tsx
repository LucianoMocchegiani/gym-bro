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
import { MemberFichaPanel } from '@/components/MemberFichaPanel';
import { RequireStaff } from '@/components/RequireStaff';
import { PageSkeleton } from '@/components/Skeleton';
import {
  IconAccount,
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

/**
 * Listado de afiliados: alta + Ficha / Cuenta en modal (CU-AFI).
 */
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
  const createOpen =
    searchParams.get('nuevo') === '1' && !fichaId && !cuentaId;

  const appliedQuery = searchParams.get('q')?.trim() || '';

  const [rows, setRows] = useState<MemberDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'ALL'>(
    'ALL',
  );
  const [query, setQuery] = useState(appliedQuery);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashOk, setFlashOk] = useState<string | null>(null);
  const [flashError, setFlashError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMembers({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
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
          : 'No se pudieron cargar afiliados',
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, appliedQuery, page]);

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

  const [prevAppliedQuery, setPrevAppliedQuery] = useState(appliedQuery);
  if (appliedQuery !== prevAppliedQuery) {
    // ?q= puede llegar de Sesiones (Roster/Waitlist): sincroniza input y página.
    setPrevAppliedQuery(appliedQuery);
    setQuery(appliedQuery);
    setPage(1);
  }

  function closeModals() {
    router.replace(
      appliedQuery
        ? `/afiliados?q=${encodeURIComponent(appliedQuery)}`
        : '/afiliados',
      { scroll: false },
    );
  }

  function openCreate() {
    setFlashOk(null);
    router.replace('/afiliados?nuevo=1', { scroll: false });
  }

  function openFicha(id: string) {
    setFlashOk(null);
    router.replace(
      `/afiliados?${appliedQuery ? `q=${encodeURIComponent(appliedQuery)}&` : ''}ficha=${encodeURIComponent(id)}`,
      { scroll: false },
    );
  }

  function openCuenta(id: string) {
    setFlashOk(null);
    router.replace(
      `/afiliados?${appliedQuery ? `q=${encodeURIComponent(appliedQuery)}&` : ''}cuenta=${encodeURIComponent(id)}`,
      { scroll: false },
    );
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
            const q = query.trim();
            router.replace(
              q ? `/afiliados?q=${encodeURIComponent(q)}` : '/afiliados',
              { scroll: false },
            );
          }}
          placeholder="Nombre, email, documento…"
        />
        <ListFilterField
          label="Estado"
          value={statusFilter}
          onChange={(v) => {
            setPage(1);
            setStatusFilter(v as MemberStatus | 'ALL');
          }}
        >
          <option value="ALL">Todos</option>
          <option value="ACTIVE">Activos</option>
          <option value="SUSPENDED">Suspendidos</option>
          <option value="INACTIVE">Inactivos</option>
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
              setFlashOk(`Ficha actualizada: ${m.name?.trim() || m.email}`);
              void load();
            }}
          />
        ) : null}
      </AdminModal>

      <AdminModal
        open={Boolean(cuentaId)}
        onClose={closeModals}
        title="Estado de cuenta"
        description="Contratos, créditos, reservas, pagos y comprobantes."
        size="comfortable"
      >
        {cuentaId ? (
          <MemberAccountPanel key={cuentaId} memberId={cuentaId} embedded />
        ) : null}
      </AdminModal>
    </AdminShell>
  );
}
