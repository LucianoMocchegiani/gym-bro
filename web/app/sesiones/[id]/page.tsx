'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { AdminGrid, Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { listMembers } from '@/lib/api/members';
import type { MemberDetail } from '@/lib/api/members';
import {
  cancelReservation,
  createCreditReservation,
  listSessionReservations,
} from '@/lib/api/reservations';
import type { ReservationDetail } from '@/lib/api/reservations';
import {
  expandSessionCapacity,
  getSession,
  updateSession,
} from '@/lib/api/sessions';
import type { SessionDetail } from '@/lib/api/sessions';
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '@/lib/catalog-labels';

type RosterFilter = 'CONFIRMED' | 'ALL';

/**
 * Edición / cancelación / ampliar cupo + roster de reservas (CU-SER-003/005, CU-RES).
 */
export default function SesionDetailPage() {
  return (
    <RequireStaff>
      <DetailInner />
    </RequireStaff>
  );
}

function DetailInner() {
  const params = useParams();
  const sessionId = String(params.id);

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState('');
  const [expandTo, setExpandTo] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandError, setExpandError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expandBusy, setExpandBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);

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
        applySession(s);
        setLoadError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
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

  function applySession(s: SessionDetail) {
    setSession(s);
    setStartsAt(toDatetimeLocalValue(s.startsAt));
    setEndsAt(toDatetimeLocalValue(s.endsAt));
    setCapacity(String(s.capacity));
    setExpandTo(String(s.capacity + 1));
  }

  async function refreshSessionAndRoster() {
    const s = await getSession(sessionId);
    applySession(s);
    await loadRoster();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session || session.status === 'CANCELLED') {
      return;
    }
    setBusy(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const updated = await updateSession(sessionId, {
        startsAt: fromDatetimeLocalValue(startsAt),
        endsAt: fromDatetimeLocalValue(endsAt),
        capacity: Number(capacity),
      });
      applySession(updated);
      setSaveOk(true);
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo guardar la sesión',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onCancel() {
    if (!session || session.status === 'CANCELLED') {
      return;
    }
    if (
      !window.confirm(
        '¿Cancelar esta sesión? Las reservas asociadas pueden verse afectadas.',
      )
    ) {
      return;
    }
    setCancelBusy(true);
    setSaveError(null);
    try {
      const updated = await updateSession(sessionId, { status: 'CANCELLED' });
      applySession(updated);
      await loadRoster();
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cancelar la sesión',
      );
    } finally {
      setCancelBusy(false);
    }
  }

  async function onExpand(e: FormEvent) {
    e.preventDefault();
    if (!session || session.status === 'CANCELLED') {
      return;
    }
    setExpandBusy(true);
    setExpandError(null);
    try {
      const updated = await expandSessionCapacity(
        sessionId,
        Number(expandTo),
      );
      applySession(updated);
    } catch (err) {
      setExpandError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo ampliar el cupo',
      );
    } finally {
      setExpandBusy(false);
    }
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
      await refreshSessionAndRoster();
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

  async function onCancelReservation(row: ReservationDetail) {
    if (row.status !== 'CONFIRMED') {
      return;
    }
    const label = row.memberName?.trim() || row.memberEmail;
    if (!window.confirm(`¿Cancelar la reserva de ${label}?`)) {
      return;
    }
    setRosterError(null);
    try {
      await cancelReservation(row.id);
      await refreshSessionAndRoster();
    } catch (err) {
      setRosterError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cancelar la reserva',
      );
    }
  }

  const cancelled = session?.status === 'CANCELLED';
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
    <AdminShell
      title={session?.serviceName ?? 'Sesión'}
      actions={
        <Link href="/sesiones" className="btn ghost">
          Volver
        </Link>
      }
    >
      {loadError ? <p className="error">{loadError}</p> : null}
      {!session && !loadError ? <p className="muted">Cargando…</p> : null}

      {session ? (
        <AdminGrid>
          <Panel title="Datos" className="form-panel">
            <p className="muted small">
              Sucursal: {session.branchName} · Reservados:{' '}
              {session.bookedCount}/{session.capacity} ·{' '}
              {cancelled ? 'Cancelada' : 'Publicada'}
            </p>
            <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
              <label>
                Inicio
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  required
                  disabled={cancelled}
                />
              </label>
              <label>
                Fin
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  required
                  disabled={cancelled}
                />
              </label>
              <label>
                Cupo
                <input
                  type="number"
                  min={session.bookedCount || 1}
                  step={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  required
                  disabled={cancelled}
                />
              </label>

              {saveError ? <p className="error">{saveError}</p> : null}
              {saveOk ? <p className="ok-msg">Guardado.</p> : null}

              {!cancelled ? (
                <div className="form-actions">
                  <button type="submit" className="primary" disabled={busy}>
                    {busy ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    className="btn danger"
                    disabled={cancelBusy}
                    onClick={() => void onCancel()}
                  >
                    {cancelBusy ? 'Cancelando…' : 'Cancelar sesión'}
                  </button>
                </div>
              ) : null}
            </form>
          </Panel>

          {!cancelled ? (
            <Panel title="Ampliar cupo" className="form-panel">
              <p className="muted small">
                Solo permite subir por encima del cupo actual (
                {session.capacity}).
              </p>
              <form className="admin-form" onSubmit={(e) => void onExpand(e)}>
                <label>
                  Nuevo cupo
                  <input
                    type="number"
                    min={session.capacity + 1}
                    step={1}
                    value={expandTo}
                    onChange={(e) => setExpandTo(e.target.value)}
                    required
                  />
                </label>
                {expandError ? <p className="error">{expandError}</p> : null}
                <button
                  type="submit"
                  className="primary"
                  disabled={expandBusy}
                >
                  {expandBusy ? 'Ampliando…' : 'Ampliar'}
                </button>
              </form>
            </Panel>
          ) : null}

          <Panel
            title="Roster"
            description={`${rosterTotal} reserva${rosterTotal === 1 ? '' : 's'} · cupo ${session.bookedCount}/${session.capacity}`}
            className="table-wrap"
          >
            <div className="toolbar">
              <label className="toolbar-field">
                Mostrar
                <select
                  value={rosterFilter}
                  onChange={(e) =>
                    setRosterFilter(e.target.value as RosterFilter)
                  }
                >
                  <option value="CONFIRMED">Confirmadas</option>
                  <option value="ALL">Todas</option>
                </select>
              </label>
            </div>

            {rosterLoading ? <p className="muted">Cargando roster…</p> : null}
            {rosterError ? <p className="error">{rosterError}</p> : null}

            {!rosterLoading && roster.length === 0 ? (
              <p className="muted">Sin reservas en este filtro.</p>
            ) : null}

            {roster.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Afiliado</th>
                    <th>Cobertura</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {roster.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link href={`/afiliados/${row.memberId}`}>
                          {row.memberName?.trim() || row.memberEmail}
                        </Link>
                      </td>
                      <td>{row.coverage === 'CREDIT' ? 'Crédito' : 'Drop-in'}</td>
                      <td>
                        <span className="badge">
                          {row.status === 'CONFIRMED'
                            ? 'Confirmada'
                            : 'Cancelada'}
                        </span>
                      </td>
                      <td>
                        {row.status === 'CONFIRMED' && !cancelled ? (
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => void onCancelReservation(row)}
                          >
                            Quitar
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {!cancelled ? (
              <form className="admin-form" onSubmit={(e) => void onBook(e)}>
                <h3>Reservar con crédito</h3>
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
            ) : null}
          </Panel>
        </AdminGrid>
      ) : null}
    </AdminShell>
  );
}
