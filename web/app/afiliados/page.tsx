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
import { AdminModal } from '@/components/AdminModal';
import { AdminShell } from '@/components/AdminShell';
import { MemberCreateForm } from '@/components/MemberCreateForm';
import { RequireStaff } from '@/components/RequireStaff';
import { StatusPill, memberStatusTone } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import { listMembers } from '@/lib/api/members';
import type { MemberDetail, MemberStatus } from '@/lib/api/members';
import { formatMemberStatus } from '@/lib/member-labels';

const PAGE_SIZE = 20;

/**
 * Listado de afiliados (CU-AFI). Alta en modal; ficha sigue en página.
 */
export default function AfiliadosPage() {
  return (
    <RequireStaff>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <AfiliadosInner />
      </Suspense>
    </RequireStaff>
  );
}

function AfiliadosInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<MemberDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'ALL'>(
    'ALL',
  );
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
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
    void load();
  }, [load]);

  function openModal() {
    setFlashOk(null);
    setModalOpen(true);
    router.replace('/afiliados?nuevo=1', { scroll: false });
  }

  function closeModal() {
    setModalOpen(false);
    router.replace('/afiliados', { scroll: false });
  }

  return (
    <AdminShell
      title="Afiliados"
      actions={
        <button type="button" className="btn" onClick={openModal}>
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
            <td className="row-actions">
              <Link href={`/afiliados/${m.id}`}>Ver</Link>
            </td>
          </tr>
        ))}
      </DataTable>

      <AdminModal
        open={modalOpen}
        onClose={closeModal}
        title="Nuevo afiliado"
        description="Alta rápida. La ficha completa sigue en Ver."
      >
        <MemberCreateForm
          onCancel={closeModal}
          onSuccess={(created) => {
            setFlashOk(
              `Afiliado creado: ${created.name?.trim() || created.email}`,
            );
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
