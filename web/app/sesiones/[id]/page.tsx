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
import { getTenantSettings } from '@/lib/api/tenant-settings';
import type { WaitlistMode } from '@/lib/api/tenant-settings';
import {
  joinWaitlistForMember,
  leaveWaitlist,
  listSessionWaitlist,
} from '@/lib/api/waitlist';
import type { WaitlistEntryDetail } from '@/lib/api/waitlist';
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '@/lib/catalog-labels';

type RosterFilter = 'CONFIRMED' | 'ALL';
type WaitlistFilter = 'WAITING' | 'ALL';

function waitlistModeLabel(mode: WaitlistMode): string {
  switch (mode) {
    case 'AUTO_ASSIGN':
      return 'Auto-asignar';
    case 'MEMBER_CONFIRM':
      return 'Confirma afiliado';
    case 'STAFF_CONFIRM':
      return 'Confirma staff';
    default:
      return mode;
  }
}

function waitlistStatusLabel(status: WaitlistEntryDetail['status']): string {
  switch (status) {
    case 'WAITING':
      return 'En cola';
    case 'PROMOTED':
      return 'Promovido';
    case 'LEFT':
      return 'Salió';
    default:
      return status;
  }
}

/**
 * Edición / cancelación / ampliar cupo + roster + waitlist (CU-SER, CU-RES-004).
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

  const [waitlistFilter, setWaitlistFilter] =
    useState<WaitlistFilter>('WAITING');
  const [waitlist, setWaitlist] = useState<WaitlistEntryDetail[]>([]);
  const [waitlistTotal, setWaitlistTotal] = useState(0);
  const [waitlistLoading, setWaitlistLoading] = useState(true);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [waitlistMode, setWaitlistMode] = useState<WaitlistMode | null>(null);
  const [wlMemberFilter, setWlMemberFilter] = useState('');
  const [wlMemberId, setWlMemberId] = useState('');
  const [wlBusy, setWlBusy] = useState(false);
  const [wlError, setWlError] = useState<string | null>(null);
  const [wlOk, setWlOk] = useState<string | null>(null);

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

  const loadWaitlist = useCallback(async () => {
    setWaitlistLoading(true);
    try {
      const result = await listSessionWaitlist(sessionId, {
        allStatuses: waitlistFilter === 'ALL' ? true : undefined,
        status: waitlistFilter === 'WAITING' ? 'WAITING' : undefined,
        pageSize: 100,
        order: 'asc',
      });
      setWaitlist(result.items);
      setWaitlistTotal(result.total);
      setWaitlistError(null);
    } catch (err) {
      setWaitlist([]);
      setWaitlistTotal(0);
      setWaitlistError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cargar la lista de espera',
      );
    } finally {
      setWaitlistLoading(false);
    }
  }, [sessionId, waitlistFilter]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [s, settings] = await Promise.all([
          getSession(sessionId),
          getTenantSettings().catch(() => null),
        ]);
        if (cancelled) {
          return;
        }
        applySession(s);
        if (settings) {
          setWaitlistMode(settings.waitlistMode);
        }
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
    // Fetch remoto al cambiar filtro/sesión.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga API
    void loadWaitlist();
  }, [loadWaitlist]);

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

  async function refreshSessionLists() {
    const s = await getSession(sessionId);
    applySession(s);
    await Promise.all([loadRoster(), loadWaitlist()]);
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
      await Promise.all([loadRoster(), loadWaitlist()]);
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
      await refreshSessionLists();
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
      await refreshSessionLists();
    } catch (err) {
      setRosterError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cancelar la reserva',
      );
    }
  }

  async function onJoinWaitlist(e: FormEvent) {
    e.preventDefault();
    if (!wlMemberId || !session || session.status === 'CANCELLED') {
      return;
    }
    setWlBusy(true);
    setWlError(null);
    setWlOk(null);
    try {
      const entry = await joinWaitlistForMember(wlMemberId, sessionId);
      const label =
        entry.memberName?.trim() ||
        entry.memberEmail ||
        entry.memberId.slice(0, 8);
      setWlOk(`En cola: ${label}`);
      setWlMemberId('');
      await loadWaitlist();
    } catch (err) {
      setWlError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo agregar a la lista de espera',
      );
    } finally {
      setWlBusy(false);
    }
  }

  async function onLeaveWaitlist(row: WaitlistEntryDetail) {
    if (row.status !== 'WAITING') {
      return;
    }
    const label = row.memberName?.trim() || row.memberEmail;
    if (!window.confirm(`¿Sacar a ${label} de la lista de espera?`)) {
      return;
    }
    setWaitlistError(null);
    try {
      await leaveWaitlist(row.id);
      await loadWaitlist();
    } catch (err) {
      setWaitlistError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo sacar de la lista de espera',
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
  const wlMemberOptions = members.filter((m) => {
    const q = wlMemberFilter.trim().toLowerCase();
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

          <Panel
            title="Lista de espera"
            description={`${waitlistTotal} en filtro · modo ${waitlistMode ? waitlistModeLabel(waitlistMode) : '…'}`}
            className="table-wrap"
          >
            <p className="muted small">
              {waitlistMode === 'AUTO_ASSIGN'
                ? 'Al liberar cupo se promociona automáticamente al primero con crédito.'
                : waitlistMode === 'MEMBER_CONFIRM' ||
                    waitlistMode === 'STAFF_CONFIRM'
                  ? 'Confirmación manual (modos 2/3) aún no tiene acciones staff en Admin.'
                  : 'Modo de waitlist del gym (Config).'}
            </p>
            <div className="toolbar">
              <label className="toolbar-field">
                Mostrar
                <select
                  value={waitlistFilter}
                  onChange={(e) =>
                    setWaitlistFilter(e.target.value as WaitlistFilter)
                  }
                >
                  <option value="WAITING">En cola</option>
                  <option value="ALL">Todas</option>
                </select>
              </label>
            </div>

            {waitlistLoading ? (
              <p className="muted">Cargando lista de espera…</p>
            ) : null}
            {waitlistError ? <p className="error">{waitlistError}</p> : null}

            {!waitlistLoading && waitlist.length === 0 ? (
              <p className="muted">Sin entradas en este filtro.</p>
            ) : null}

            {waitlist.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Afiliado</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {waitlist.map((row) => (
                    <tr key={row.id}>
                      <td>{row.position ?? '—'}</td>
                      <td>
                        <Link href={`/afiliados/${row.memberId}`}>
                          {row.memberName?.trim() || row.memberEmail}
                        </Link>
                      </td>
                      <td>
                        <span className="badge">
                          {waitlistStatusLabel(row.status)}
                        </span>
                      </td>
                      <td>
                        {row.status === 'WAITING' && !cancelled ? (
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => void onLeaveWaitlist(row)}
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
              <form
                className="admin-form"
                onSubmit={(e) => void onJoinWaitlist(e)}
              >
                <h3>Agregar a la cola</h3>
                <p className="muted small">
                  Solo si la sesión está llena (o según reglas de ingreso
                  tardío). Requiere afiliado activo sin reserva confirmada.
                </p>
                <label>
                  Filtrar afiliados
                  <input
                    value={wlMemberFilter}
                    onChange={(e) => setWlMemberFilter(e.target.value)}
                    placeholder="Nombre o email"
                  />
                </label>
                <label>
                  Afiliado
                  <select
                    value={wlMemberId}
                    onChange={(e) => setWlMemberId(e.target.value)}
                    required
                  >
                    <option value="">Elegí…</option>
                    {wlMemberOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name?.trim() || m.email}
                      </option>
                    ))}
                  </select>
                </label>
                {wlError ? <p className="error">{wlError}</p> : null}
                {wlOk ? <p className="ok-msg">{wlOk}</p> : null}
                <button
                  type="submit"
                  className="primary"
                  disabled={wlBusy || !wlMemberId}
                >
                  {wlBusy ? 'Agregando…' : 'Agregar a waitlist'}
                </button>
              </form>
            ) : null}
          </Panel>
        </AdminGrid>
      ) : null}
    </AdminShell>
  );
}
