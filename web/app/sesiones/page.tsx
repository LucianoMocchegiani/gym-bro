'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DataTable,
  listCountDescription,
} from '@/components/AdminList';
import { AdminModal } from '@/components/AdminModal';
import { AdminShell } from '@/components/AdminShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageTabs } from '@/components/PageTabs';
import { RequireStaff } from '@/components/RequireStaff';
import { SessionCalendar, startOfWeek } from '@/components/SessionCalendar';
import { PageSkeleton } from '@/components/Skeleton';
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

type View = 'calendar' | 'rules';

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

function formatDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function formatWeekdays(days: Weekday[]): string {
  return days.map((d) => WEEKDAY_SHORT[d] ?? d).join(' ');
}

/**
 * Sesiones: calendario semanal y recurrencias + modales Datos/Roster/Waitlist.
 */
export default function SesionesPage() {
  return (
    <RequireStaff>
      <Suspense fallback={<PageSkeleton />}>
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

  const [view, setView] = useState<View>(
    searchParams.get('view') === 'rules' ? 'rules' : 'calendar',
  );
  const [prevViewParam, setPrevViewParam] = useState<string | null>(() =>
    searchParams.get('view'),
  );
  const viewParam = searchParams.get('view');
  if (viewParam !== prevViewParam) {
    setPrevViewParam(viewParam);
    setView(viewParam === 'rules' ? 'rules' : 'calendar');
  }
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date()),
  );
  const [flashOk, setFlashOk] = useState<string | null>(null);
  const [listKey, setListKey] = useState(0);

  function closeModals() {
    const created = searchParams.get('created');
    const qs = created
      ? `?view=rules&created=${created}`
      : view === 'rules'
        ? '?view=rules'
        : '';
    router.replace(`/sesiones${qs}`, { scroll: false });
  }

  function openCreate() {
    setFlashOk(null);
    const qs = view === 'rules' ? '?view=rules&nuevo=1' : '?nuevo=1';
    router.replace(`/sesiones${qs}`, { scroll: false });
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
      <PageTabs
        label="Secciones de sesiones"
        tabs={[
          { href: '/sesiones', label: 'Calendario', active: view === 'calendar' },
          {
            href: '/sesiones?view=rules',
            label: 'Recurrencias',
            active: view === 'rules',
          },
        ]}
      />

      {flashOk ? <p className="ok-msg">{flashOk}</p> : null}

      {view === 'calendar' ? (
        <SessionCalendar
          weekStart={weekStart}
          onWeekChange={setWeekStart}
          onOpenDatos={openDatos}
          onOpenRoster={openRoster}
          onOpenWaitlist={openWaitlist}
          refreshKey={listKey}
        />
      ) : null}
      {view === 'rules' ? <RulesList /> : null}

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
            setView('calendar');
            setListKey((k) => k + 1);
            router.replace('/sesiones', { scroll: false });
          }}
          onSuccessRule={(created) => {
            setFlashOk(`Recurrencia creada: ${created.serviceName}`);
            setView('rules');
            router.replace(
              `/sesiones?view=rules&created=${encodeURIComponent(created.id)}`,
              { scroll: false },
            );
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
            onCancel={closeModals}
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
  const [deactivateTarget, setDeactivateTarget] =
    useState<RecurrenceRuleDetail | null>(null);
  const [deactivateBusy, setDeactivateBusy] = useState(false);

  const [reload, setReload] = useState(0);

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
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load, reload]);

  async function doDeactivate() {
    const rule = deactivateTarget;
    if (!rule || !rule.active) {
      return;
    }
    setDeactivateBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      await deactivateRecurrenceRule(rule.id);
      setOkMsg('Recurrencia desactivada.');
      setReload((r) => r + 1);
      setDeactivateTarget(null);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo desactivar la recurrencia',
      );
    } finally {
      setDeactivateBusy(false);
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
                  onClick={() => setDeactivateTarget(r)}
                >
                  Desactivar
                </button>
              ) : null}
            </td>
          </tr>
        ))}
      </DataTable>

      <ConfirmDialog
        open={deactivateTarget !== null}
        title="Desactivar recurrencia"
        description={`¿Desactivar la recurrencia de ${deactivateTarget?.serviceName ?? ''}? Las sesiones ya generadas no se cancelan.`}
        confirmLabel="Desactivar"
        tone="danger"
        busy={deactivateBusy}
        onConfirm={() => void doDeactivate()}
        onCancel={() => setDeactivateTarget(null)}
      />
    </>
  );
}