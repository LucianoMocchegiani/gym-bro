'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  DataTable,
  ListFilterField,
  ListToolbar,
} from '@/components/AdminList';
import { Panel } from '@/components/AdminUi';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SkeletonTable } from '@/components/Skeleton';
import { memberFichaHref } from '@/lib/member-link';
import { StatusPill } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import { listMembers } from '@/lib/api/members';
import type { MemberDetail } from '@/lib/api/members';
import {
  cancelReservation,
  createCreditReservation,
  listSessionReservations,
} from '@/lib/api/reservations';
import type { ReservationDetail } from '@/lib/api/reservations';
import { getSession } from '@/lib/api/sessions';
import type { SessionDetail } from '@/lib/api/sessions';

type RosterFilter = 'CONFIRMED' | 'ALL';

/**
 * Roster de la sesión: listado, cancelar reserva y reservar con crédito (CU-RES-004).
 *
 * @remarks Pensado para detalle y modal; no depende de AdminShell.
 */
export function SessionRosterPanel({
  sessionId,
  embedded = false,
}: {
  sessionId: string;
  /** Omite título de DataTable si el modal ya lo muestra. */
  embedded?: boolean;
}) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [rosterFilter, setRosterFilter] = useState<RosterFilter>('CONFIRMED');
  const [roster, setRoster] = useState<ReservationDetail[]>([]);
  const [rosterTotal, setRosterTotal] = useState(0);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const [members, setMembers] = useState<MemberDetail[]>([]);
  const [memberFilter, setMemberFilter] = useState('');
  const [memberId, setMemberId] = useState('');
  const [bookBusy, setBookBusy] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookOk, setBookOk] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ReservationDetail | null>(
    null,
  );
  const [cancelBusy, setCancelBusy] = useState(false);

  const loadSession = useCallback(async () => {
    try {
      const s = await getSession(sessionId);
      setSession(s);
      setLoadError(null);
      return s;
    } catch (err) {
      setSession(null);
      setLoadError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cargar la sesión',
      );
      return null;
    }
  }, [sessionId]);

  const loadRoster = useCallback(async () => {
    setRosterLoading(true);
    try {
      const result = await listSessionReservations(sessionId, {
        status: rosterFilter === 'CONFIRMED' ? 'CONFIRMED' : undefined,
        pageSize: 100,
        order: 'asc',
        orderBy: 'createdAt',
      });
      setRoster(result.items);
      setRosterTotal(result.total);
      setRosterError(null);
    } catch (err) {
      setRoster([]);
      setRosterTotal(0);
      setRosterError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cargar el roster',
      );
    } finally {
      setRosterLoading(false);
    }
  }, [sessionId, rosterFilter]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await getSession(sessionId);
        if (cancelled) {
          return;
        }
        setSession(s);
        setLoadError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setSession(null);
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar la sesión',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    // Fetch remoto al cambiar filtro/sesión.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga API
    void loadRoster();
  }, [loadRoster]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await listMembers({
          status: 'ACTIVE',
          pageSize: 100,
          order: 'asc',
          orderBy: 'name',
        });
        if (!cancelled) {
          setMembers(result.items);
        }
      } catch {
        if (!cancelled) {
          setMembers([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshAfterMutation() {
    await Promise.all([loadSession(), loadRoster()]);
  }

  async function onBook(e: FormEvent) {
    e.preventDefault();
    if (!memberId || !session || session.status === 'CANCELLED') {
      return;
    }
    setBookBusy(true);
    setBookError(null);
    setBookOk(null);
    try {
      const res = await createCreditReservation(memberId, sessionId);
      const label =
        res.memberName?.trim() || res.memberEmail || res.memberId.slice(0, 8);
      setBookOk(`Reservado: ${label}`);
      setMemberId('');
      await refreshAfterMutation();
    } catch (err) {
      setBookError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo crear la reserva',
      );
    } finally {
      setBookBusy(false);
    }
  }

  async function doCancelReservation() {
    const row = cancelTarget;
    if (!row || row.status !== 'CONFIRMED') {
      return;
    }
    setCancelBusy(true);
    setRosterError(null);
    try {
      await cancelReservation(row.id);
      await refreshAfterMutation();
      setCancelTarget(null);
    } catch (err) {
      setRosterError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cancelar la reserva',
      );
    } finally {
      setCancelBusy(false);
    }
  }

  if (loadError) {
    return <p className="error">{loadError}</p>;
  }
  if (!session) {
    return <SkeletonTable rows={5} cols={4} />;
  }

  const cancelled = session.status === 'CANCELLED';
  const memberOptions = members.filter((m) => {
    const q = memberFilter.trim().toLowerCase();
    if (!q) {
      return true;
    }
    return (
      (m.name?.toLowerCase().includes(q) ?? false) ||
      m.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="admin-stack">
      {!cancelled ? (
        <Panel title="Reservar con crédito" className="form-panel">
          <form className="admin-form" onSubmit={(e) => void onBook(e)}>
            <p className="muted small">
              Consume 1 crédito del pack del afiliado. Drop-in CASH → Caja.
            </p>
            <label>
              Filtrar afiliados
              <input
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                placeholder="Nombre o email"
              />
            </label>
            <label>
              Afiliado
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                required
              >
                <option value="">Elegí…</option>
                {memberOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name?.trim() || m.email}
                  </option>
                ))}
              </select>
            </label>
            {bookError ? <p className="error">{bookError}</p> : null}
            {bookOk ? <p className="ok-msg">{bookOk}</p> : null}
            <button
              type="submit"
              className="primary"
              disabled={bookBusy || !memberId}
            >
              {bookBusy ? 'Reservando…' : 'Agregar al roster'}
            </button>
          </form>
        </Panel>
      ) : null}

      <ListToolbar
        hint={`Staff a cargo: ${session.instructorName ?? 'Sin asignar'}`}
      >
        <ListFilterField
          label="Roster"
          value={rosterFilter}
          onChange={(v) => setRosterFilter(v as RosterFilter)}
        >
          <option value="CONFIRMED">Confirmadas</option>
          <option value="ALL">Todas</option>
        </ListFilterField>
      </ListToolbar>

      <DataTable
        title={embedded ? undefined : 'Roster'}
        description={`${rosterTotal} reserva${rosterTotal === 1 ? '' : 's'} · cupo ${session.bookedCount}/${session.capacity}`}
        loading={rosterLoading}
        error={rosterError}
        isEmpty={roster.length === 0}
        emptyText="Sin reservas en este filtro."
        paginate={false}
        header={
          <>
            <th>Afiliado</th>
            <th>Cobertura</th>
            <th>Estado</th>
            <th />
          </>
        }
      >
        {roster.map((row) => (
          <tr key={row.id}>
            <td>
              <Link
                href={memberFichaHref(
                  row.memberId,
                  row.memberName ?? row.memberEmail ?? '',
                )}
              >
                {row.memberName?.trim() || row.memberEmail}
              </Link>
            </td>
            <td>{row.coverage === 'CREDIT' ? 'Crédito' : 'Drop-in'}</td>
            <td>
              <StatusPill
                tone={row.status === 'CONFIRMED' ? 'ok' : 'muted'}
              >
                {row.status === 'CONFIRMED' ? 'Confirmada' : 'Cancelada'}
              </StatusPill>
            </td>
            <td className="row-actions">
              {row.status === 'CONFIRMED' && !cancelled ? (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setCancelTarget(row)}
                >
                  Quitar
                </button>
              ) : null}
            </td>
          </tr>
        ))}
      </DataTable>

      <ConfirmDialog
        open={cancelTarget !== null}
        title="Cancelar reserva"
        description={`¿Cancelar la reserva de ${
          cancelTarget?.memberName?.trim() || cancelTarget?.memberEmail || ''
        }?`}
        confirmLabel="Cancelar reserva"
        tone="danger"
        busy={cancelBusy}
        onConfirm={() => void doCancelReservation()}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
