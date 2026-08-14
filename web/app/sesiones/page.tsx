'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DataTable,
  ListFilterField,
  ListToolbar,
  listCountDescription,
} from '@/components/AdminList';
import { AdminModal } from '@/components/AdminModal';
import { AdminShell } from '@/components/AdminShell';
import { RequireStaff } from '@/components/RequireStaff';
import {
  IconEdit,
  IconRoster,
  IconWaitlist,
  RowActions,
  RowIconButton,
} from '@/components/RowActions';
import { SessionCreateForm } from '@/components/SessionCreateForm';
import { SessionDatosPanel } from '@/components/SessionDatosPanel';
import { SessionRosterPanel } from '@/components/SessionRosterPanel';
import { SessionWaitlistPanel } from '@/components/SessionWaitlistPanel';
import { StatusPill, activeTone } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import {
  deactivateRecurrenceRule,
  listRecurrenceRules,
} from '@/lib/api/recurrence-rules';
import type {
  RecurrenceRuleDetail,
  Weekday,
} from '@/lib/api/recurrence-rules';
import { listSessions } from '@/lib/api/sessions';
import type { SessionDetail, SessionStatus } from '@/lib/api/sessions';

type View = 'sessions' | 'rules';

const PAGE_SIZE = 20;

const WEEKDAY_SHORT: Record<Weekday, string> = {
  MONDAY: 'L',
  TUESDAY: 'M',
  WEDNESDAY: 'X',
  THURSDAY: 'J',
  FRIDAY: 'V',
  SATURDAY: 'S',
  SUNDAY: 'D',
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function formatDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function formatWeekdays(days: Weekday[]): string {
  return days.map((d) => WEEKDAY_SHORT[d] ?? d).join(' ');
}

/**
 * Listado de sesiones: Datos / Roster / Waitlist + alta en modal.
 */
export default function SesionesPage() {
  return (
    <RequireStaff>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <SesionesInner />
      </Suspense>
    </RequireStaff>
  );
}

function SesionesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const datosId = searchParams.get('datos')?.trim() || null;
  const rosterId = searchParams.get('roster')?.trim() || null;
  const waitlistId = searchParams.get('waitlist')?.trim() || null;
  const createOpen =
    searchParams.get('nuevo') === '1' && !datosId && !rosterId && !waitlistId;

  const initialView: View =
    searchParams.get('view') === 'rules' ? 'rules' : 'sessions';
  const [view, setView] = useState<View>(initialView);
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'ALL'>(
    'PUBLISHED',
  );
  const [flashOk, setFlashOk] = useState<string | null>(null);
  const [listKey, setListKey] = useState(0);

  useEffect(() => {
    if (searchParams.get('view') === 'rules') {
      setView('rules');
    }
  }, [searchParams]);

  function closeModals() {
    const qs =
      view === 'rules'
        ? '?view=rules'
        : searchParams.get('created')
          ? `?view=rules&created=${searchParams.get('created')}`
          : '';
    router.replace(`/sesiones${qs}`, { scroll: false });
  }

  function openCreate() {
    setFlashOk(null);
    router.replace('/sesiones?nuevo=1', { scroll: false });
  }

  function openDatos(id: string) {
    setFlashOk(null);
    router.replace(`/sesiones?datos=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  function openRoster(id: string) {
    setFlashOk(null);
    router.replace(`/sesiones?roster=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  function openWaitlist(id: string) {
    setFlashOk(null);
    router.replace(`/sesiones?waitlist=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  return (
    <AdminShell
      title="Sesiones"
      actions={
        <button type="button" className="btn" onClick={openCreate}>
          + Nueva
        </button>
      }
    >
      <ListToolbar>
        <ListFilterField
          label="Ver"
          value={view}
          onChange={(v) => setView(v as View)}
        >
          <option value="sessions">Sesiones</option>
          <option value="rules">Recurrencias</option>
        </ListFilterField>
        {view === 'sessions' ? (
          <ListFilterField
            label="Estado"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as SessionStatus | 'ALL')}
          >
            <option value="PUBLISHED">Publicadas</option>
            <option value="CANCELLED">Canceladas</option>
            <option value="ALL">Todas</option>
          </ListFilterField>
        ) : null}
      </ListToolbar>

      {flashOk ? <p className="ok-msg">{flashOk}</p> : null}

      {view === 'sessions' ? (
        <SessionsList
          key={`${statusFilter}-${listKey}`}
          statusFilter={statusFilter}
          onDatos={openDatos}
          onRoster={openRoster}
          onWaitlist={openWaitlist}
        />
      ) : (
        <RulesList />
      )}

      <AdminModal
        open={createOpen}
        onClose={closeModals}
        title="Nueva sesión"
        description="Puntual o recurrencia semanal."
        size="comfortable"
      >
        <SessionCreateForm
          onCancel={closeModals}
          onSuccessSession={(created) => {
            setFlashOk(`Sesión creada: ${created.serviceName}`);
            closeModals();
            setView('sessions');
            setListKey((k) => k + 1);
          }}
          onSuccessRule={(created) => {
            setFlashOk(`Recurrencia creada: ${created.serviceName}`);
            router.replace(
              `/sesiones?view=rules&created=${encodeURIComponent(created.id)}`,
              { scroll: false },
            );
            setView('rules');
          }}
        />
      </AdminModal>

      <AdminModal
        open={Boolean(datosId)}
        onClose={closeModals}
        title="Datos de la sesión"
        description="Horario, cupo, cancelar y ampliar."
        size="comfortable"
      >
        {datosId ? (
          <SessionDatosPanel
            key={datosId}
            sessionId={datosId}
            embedded
            onSaved={() => setListKey((k) => k + 1)}
          />
        ) : null}
      </AdminModal>

      <AdminModal
        open={Boolean(rosterId)}
        onClose={closeModals}
        title="Roster"
        description="Reservas y alta con crédito."
        size="comfortable"
      >
        {rosterId ? (
          <SessionRosterPanel key={rosterId} sessionId={rosterId} embedded />
        ) : null}
      </AdminModal>

      <AdminModal
        open={Boolean(waitlistId)}
        onClose={closeModals}
        title="Lista de espera"
        description="Cola y alta staff."
        size="comfortable"
      >
        {waitlistId ? (
          <SessionWaitlistPanel
            key={waitlistId}
            sessionId={waitlistId}
            embedded
          />
        ) : null}
      </AdminModal>
    </AdminShell>
  );
}

function SessionsList({
  statusFilter,
  onDatos,
  onRoster,
  onWaitlist,
}: {
  statusFilter: SessionStatus | 'ALL';
  onDatos: (id: string) => void;
  onRoster: (id: string) => void;
  onWaitlist: (id: string) => void;
}) {
  const [rows, setRows] = useState<SessionDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await listSessions({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          page,
          pageSize: PAGE_SIZE,
        });
        if (cancelled) {
          return;
        }
        setRows(data.items);
        setTotal(data.total);
        setHasMore(data.hasMore);
        setError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudieron cargar sesiones',
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, page]);

  return (
    <DataTable
      description={listCountDescription(total, page, 'sesión', 'sesiones')}
      loading={loading}
      error={error}
      isEmpty={rows.length === 0}
      emptyText="No hay sesiones con ese filtro."
      page={page}
      hasMore={hasMore}
      onPageChange={setPage}
      header={
        <>
          <th>Servicio</th>
          <th>Inicio</th>
          <th>Fin</th>
          <th>Cupo</th>
          <th>Estado</th>
          <th />
        </>
      }
    >
      {rows.map((s) => (
        <tr key={s.id}>
          <td>{s.serviceName}</td>
          <td>{formatWhen(s.startsAt)}</td>
          <td>{formatWhen(s.endsAt)}</td>
          <td>
            {s.bookedCount}/{s.capacity}
          </td>
          <td>
            <StatusPill tone={activeTone(s.status === 'PUBLISHED')}>
              {s.status === 'PUBLISHED' ? 'Publicada' : 'Cancelada'}
            </StatusPill>
          </td>
          <td>
            <RowActions>
              <RowIconButton
                label="Datos"
                onClick={() => onDatos(s.id)}
              >
                <IconEdit />
              </RowIconButton>
              <RowIconButton
                label="Roster"
                onClick={() => onRoster(s.id)}
              >
                <IconRoster />
              </RowIconButton>
              <RowIconButton
                label="Lista de espera"
                onClick={() => onWaitlist(s.id)}
              >
                <IconWaitlist />
              </RowIconButton>
            </RowActions>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}

function RulesList() {
  const searchParams = useSearchParams();
  const createdId = searchParams.get('created');
  const [rows, setRows] = useState<RecurrenceRuleDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(
    createdId ? 'Recurrencia creada.' : null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listRecurrenceRules({
        page,
        pageSize: PAGE_SIZE,
        order: 'desc',
        orderBy: 'createdAt',
      });
      setRows(data.items);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setError(null);
    } catch (err) {
      setRows([]);
      setTotal(0);
      setHasMore(false);
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudieron cargar las recurrencias',
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    // Fetch remoto al cambiar página.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga API
    void load();
  }, [load]);

  async function onDeactivate(rule: RecurrenceRuleDetail) {
    if (!rule.active) {
      return;
    }
    if (
      !window.confirm(
        `¿Desactivar la recurrencia de ${rule.serviceName}? Las sesiones ya generadas no se cancelan.`,
      )
    ) {
      return;
    }
    setError(null);
    setOkMsg(null);
    try {
      await deactivateRecurrenceRule(rule.id);
      setOkMsg('Recurrencia desactivada.');
      await load();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo desactivar la recurrencia',
      );
    }
  }

  return (
    <>
      {okMsg ? <p className="ok-msg">{okMsg}</p> : null}
      <DataTable
        title="Recurrencias"
        description={listCountDescription(total, page, 'regla', 'reglas')}
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText="No hay reglas. Creá una desde + Nueva → Recurrente."
        page={page}
        hasMore={hasMore}
        onPageChange={setPage}
        header={
          <>
            <th>Servicio</th>
            <th>Días</th>
            <th>Hora</th>
            <th>Rango</th>
            <th>Cupo</th>
            <th>Sesiones</th>
            <th>Estado</th>
            <th />
          </>
        }
      >
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.serviceName}</td>
            <td>{formatWeekdays(r.weekdays)}</td>
            <td>
              {r.localStartTime} · {r.durationMinutes} min
            </td>
            <td>
              {formatDateOnly(r.startsOn)} → {formatDateOnly(r.endsOn)}
            </td>
            <td>{r.capacity}</td>
            <td>{r.generatedSessionsCount}</td>
            <td>
              <StatusPill tone={activeTone(r.active)}>
                {r.active ? 'Activa' : 'Inactiva'}
              </StatusPill>
            </td>
            <td className="row-actions">
              {r.active ? (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => void onDeactivate(r)}
                >
                  Desactivar
                </button>
              ) : null}
            </td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
