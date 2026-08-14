'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
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
 * Listado de sesiones y reglas de recurrencia (CU-SER-003/004).
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
  const searchParams = useSearchParams();
  const initialView: View =
    searchParams.get('view') === 'rules' ? 'rules' : 'sessions';
  const [view, setView] = useState<View>(initialView);

  useEffect(() => {
    if (searchParams.get('view') === 'rules') {
      setView('rules');
    }
  }, [searchParams]);

  return (
    <AdminShell
      title="Sesiones"
      actions={
        <Link href="/sesiones/nuevo" className="btn">
          + Nueva
        </Link>
      }
    >
      <Panel className="toolbar">
        <label className="toolbar-field">
          Ver
          <select
            value={view}
            onChange={(e) => setView(e.target.value as View)}
          >
            <option value="sessions">Sesiones</option>
            <option value="rules">Recurrencias</option>
          </select>
        </label>
      </Panel>

      {view === 'sessions' ? <SessionsList /> : <RulesList />}
    </AdminShell>
  );
}

function SessionsList() {
  const [rows, setRows] = useState<SessionDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'ALL'>(
    'PUBLISHED',
  );
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
    <>
      <Panel className="toolbar">
        <label className="toolbar-field">
          Estado
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value as SessionStatus | 'ALL');
            }}
          >
            <option value="PUBLISHED">Publicadas</option>
            <option value="CANCELLED">Canceladas</option>
            <option value="ALL">Todas</option>
          </select>
        </label>
      </Panel>

      {loading ? <p className="muted">Cargando…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error ? (
        <Panel
          title="Listado"
          description={`${total} sesión${total === 1 ? '' : 'es'} · página ${page}`}
          className="table-wrap"
        >
          {rows.length === 0 ? (
            <p className="muted">No hay sesiones con ese filtro.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Cupo</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td>{s.serviceName}</td>
                    <td>{formatWhen(s.startsAt)}</td>
                    <td>{formatWhen(s.endsAt)}</td>
                    <td>
                      {s.bookedCount}/{s.capacity}
                    </td>
                    <td>
                      <span
                        className={`status-pill ${s.status === 'PUBLISHED' ? 'active' : 'inactive'}`}
                      >
                        {s.status === 'PUBLISHED'
                          ? 'Publicada'
                          : 'Cancelada'}
                      </span>
                    </td>
                    <td className="row-actions">
                      <Link href={`/sesiones/${s.id}`}>Editar</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="pager">
            <button
              type="button"
              className="btn ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <span className="muted small">Página {page}</span>
            <button
              type="button"
              className="btn ghost"
              disabled={!hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </Panel>
      ) : null}
    </>
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
      {loading ? <p className="muted">Cargando…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error ? (
        <Panel
          title="Recurrencias"
          description={`${total} regla${total === 1 ? '' : 's'} · página ${page}`}
          className="table-wrap"
        >
          {rows.length === 0 ? (
            <p className="muted">
              No hay reglas. Creá una desde + Nueva → Recurrente.
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Días</th>
                  <th>Hora</th>
                  <th>Rango</th>
                  <th>Cupo</th>
                  <th>Sesiones</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.serviceName}</td>
                    <td>{formatWeekdays(r.weekdays)}</td>
                    <td>
                      {r.localStartTime} · {r.durationMinutes} min
                    </td>
                    <td>
                      {formatDateOnly(r.startsOn)} →{' '}
                      {formatDateOnly(r.endsOn)}
                    </td>
                    <td>{r.capacity}</td>
                    <td>{r.generatedSessionsCount}</td>
                    <td>
                      <span
                        className={`status-pill ${r.active ? 'active' : 'inactive'}`}
                      >
                        {r.active ? 'Activa' : 'Inactiva'}
                      </span>
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
              </tbody>
            </table>
          )}
          <div className="pager">
            <button
              type="button"
              className="btn ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <span className="muted small">Página {page}</span>
            <button
              type="button"
              className="btn ghost"
              disabled={!hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </Panel>
      ) : null}
    </>
  );
}
