'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  DataTable,
  ListFilterField,
  ListToolbar,
} from '@/components/AdminList';
import { Panel } from '@/components/AdminUi';
import { StatusPill } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import { listMembers } from '@/lib/api/members';
import type { MemberDetail } from '@/lib/api/members';
import { getSession } from '@/lib/api/sessions';
import type { SessionDetail } from '@/lib/api/sessions';
import { getTenantSettings } from '@/lib/api/tenant-settings';
import type { WaitlistMode } from '@/lib/api/tenant-settings';
import {
  joinWaitlistForMember,
  leaveWaitlist,
  listSessionWaitlist,
} from '@/lib/api/waitlist';
import type { WaitlistEntryDetail } from '@/lib/api/waitlist';

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
 * Lista de espera de la sesión: filtro, join/leave y nota de modo (CU-RES waitlist).
 *
 * @remarks Pensado para detalle y modal; no depende de AdminShell.
 */
export function SessionWaitlistPanel({
  sessionId,
  embedded = false,
}: {
  sessionId: string;
  /** Omite título de DataTable si el modal ya lo muestra. */
  embedded?: boolean;
}) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [waitlistMode, setWaitlistMode] = useState<WaitlistMode | null>(null);

  const [waitlistFilter, setWaitlistFilter] =
    useState<WaitlistFilter>('WAITING');
  const [waitlist, setWaitlist] = useState<WaitlistEntryDetail[]>([]);
  const [waitlistTotal, setWaitlistTotal] = useState(0);
  const [waitlistLoading, setWaitlistLoading] = useState(true);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  const [members, setMembers] = useState<MemberDetail[]>([]);
  const [wlMemberFilter, setWlMemberFilter] = useState('');
  const [wlMemberId, setWlMemberId] = useState('');
  const [wlBusy, setWlBusy] = useState(false);
  const [wlError, setWlError] = useState<string | null>(null);
  const [wlOk, setWlOk] = useState<string | null>(null);

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
        setSession(s);
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

  if (loadError) {
    return <p className="error">{loadError}</p>;
  }
  if (!session) {
    return <p className="muted">Cargando…</p>;
  }

  const cancelled = session.status === 'CANCELLED';
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
    <div className="admin-stack">
      <ListToolbar>
        <ListFilterField
          label="Waitlist"
          value={waitlistFilter}
          onChange={(v) => setWaitlistFilter(v as WaitlistFilter)}
        >
          <option value="WAITING">En cola</option>
          <option value="ALL">Todas</option>
        </ListFilterField>
      </ListToolbar>

      <DataTable
        title={embedded ? undefined : 'Lista de espera'}
        description={`${waitlistTotal} en filtro · modo ${waitlistMode ? waitlistModeLabel(waitlistMode) : '…'}`}
        loading={waitlistLoading}
        error={waitlistError}
        isEmpty={waitlist.length === 0}
        emptyText="Sin entradas en este filtro."
        paginate={false}
        header={
          <>
            <th>#</th>
            <th>Afiliado</th>
            <th>Estado</th>
            <th />
          </>
        }
      >
        {waitlist.map((row) => (
          <tr key={row.id}>
            <td>{row.position ?? '—'}</td>
            <td>
              <Link href={`/afiliados/${row.memberId}`}>
                {row.memberName?.trim() || row.memberEmail}
              </Link>
            </td>
            <td>
              <StatusPill
                tone={
                  row.status === 'WAITING'
                    ? 'warn'
                    : row.status === 'PROMOTED'
                      ? 'ok'
                      : 'muted'
                }
              >
                {waitlistStatusLabel(row.status)}
              </StatusPill>
            </td>
            <td className="row-actions">
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
      </DataTable>

      <p className="muted small">
        {waitlistMode === 'AUTO_ASSIGN'
          ? 'Al liberar cupo se promociona automáticamente al primero con crédito.'
          : waitlistMode === 'MEMBER_CONFIRM' ||
              waitlistMode === 'STAFF_CONFIRM'
            ? 'Confirmación manual (modos 2/3) aún no tiene acciones staff en Admin.'
            : 'Modo de waitlist del gym (Config).'}
      </p>

      {!cancelled ? (
        <Panel title="Agregar a la cola" className="form-panel">
          <form
            className="admin-form"
            onSubmit={(e) => void onJoinWaitlist(e)}
          >
            <p className="muted small">
              Solo si la sesión está llena (o según reglas de ingreso tardío).
              Requiere afiliado activo sin reserva confirmada.
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
        </Panel>
      ) : null}
    </div>
  );
}
