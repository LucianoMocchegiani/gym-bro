'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { SkeletonTable } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import { deleteSession, listSessions } from '@/lib/api/sessions';
import type { SessionDetail } from '@/lib/api/sessions';
import { DeleteRowButton } from '@/components/DeleteRowButton';
import {
  IconDots,
  IconEdit,
  IconRoster,
  IconWaitlist,
  RowActions,
  RowIconButton,
} from '@/components/RowActions';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HOUR_START = 6;
const HOUR_END = 24;
const PX_PER_HOUR = 72;

/** Lunes de la semana que contiene `d` (a las 00:00 local). */
export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Top y alto (px) del bloque de sesión dentro de su columna de día. */
function blockStyle(s: SessionDetail): { top: number; height: number } {
  const start = new Date(s.startsAt);
  const end = new Date(s.endsAt);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();
  const top = Math.max(0, ((startMin - HOUR_START * 60) / 60) * PX_PER_HOUR);
  const durMin = Math.max(
    15,
    Math.min(endMin, HOUR_END * 60) - Math.max(startMin, HOUR_START * 60),
  );
  return { top, height: Math.max(40, (durMin / 60) * PX_PER_HOUR) };
}

type PositionedSession = {
  s: SessionDetail;
  left: number;
  width: number;
};

/**
 * Reparte sesiones superpuestas de un día en columnas laterales (estilo
 * calendario). Solo las que realmente se superponen se dividen el ancho; las
 * que están solas ocupan el ancho completo. Las superposiciones se agrupan en
 * clusters (cadena de solapamientos) y dentro de cada cluster se asignan
 * columnas libres (la que ya quedó libre por una sesión que terminó).
 */
function layoutDay(daySessions: SessionDetail[]): PositionedSession[] {
  const sorted = [...daySessions].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
  const out: PositionedSession[] = [];
  let cluster: SessionDetail[] = [];
  let clusterEnd = -Infinity;

  function flush() {
    if (cluster.length === 0) {
      return;
    }
    const colEnds: number[] = [];
    const placed = cluster.map((s) => {
      const start = new Date(s.startsAt).getTime();
      const end = new Date(s.endsAt).getTime();
      let col = colEnds.findIndex((ce) => ce <= start);
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(0);
      }
      colEnds[col] = Math.max(colEnds[col], end);
      return { s, col };
    });
    const cols = Math.max(1, colEnds.length);
    for (const { s, col } of placed) {
      out.push({ s, left: (col / cols) * 100, width: 100 / cols });
    }
    cluster = [];
    clusterEnd = -Infinity;
  }

  for (const s of sorted) {
    const start = new Date(s.startsAt).getTime();
    const end = new Date(s.endsAt).getTime();
    if (start >= clusterEnd) {
      flush();
    }
    cluster.push(s);
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();
  return out;
}

/** Acciones de sesión con etiqueta (menú flotante). */
function SessionBlockActions({
  session,
  onDatos,
  onRoster,
  onWaitlist,
  onDeleted,
  onError,
  onClose,
}: {
  session: SessionDetail;
  onDatos: (id: string) => void;
  onRoster: (id: string) => void;
  onWaitlist: (id: string) => void;
  onDeleted: () => void;
  onError: (err: ApiClientError) => void;
  onClose: () => void;
}) {
  return (
    <RowActions>
      <RowIconButton
        label="Datos"
        onClick={() => {
          onDatos(session.id);
          onClose();
        }}
      >
        <IconEdit />
        <span>Datos</span>
      </RowIconButton>
      <RowIconButton
        label="Roster"
        onClick={() => {
          onRoster(session.id);
          onClose();
        }}
      >
        <IconRoster />
        <span>Roster</span>
      </RowIconButton>
      <RowIconButton
        label="Lista de espera"
        onClick={() => {
          onWaitlist(session.id);
          onClose();
        }}
      >
        <IconWaitlist />
        <span>Lista de espera</span>
      </RowIconButton>
      <DeleteRowButton
        dialogTitle="Eliminar sesión?"
        description={`Se eliminará la sesión de ${session.serviceName} (${timeLabel(session.startsAt)}). Si tiene reservas, no se podrá eliminar.`}
        onDelete={() => deleteSession(session.id)}
        onSuccess={() => {
          onClose();
          onDeleted();
        }}
        onError={onError}
      />
    </RowActions>
  );
}

/**
 * Calendario semanal de sesiones (vista principal de Sesiones).
 *
 * @remarks Grilla de 7 días tipo Teams: columna de horas a la izquierda y una
 * columna por día de la semana, con cada sesión ubicada según su horario.
 * Las acciones (Datos / Roster / Waitlist / Eliminar) van como iconos en el
 * bloque; si hay sesiones superpuestas (bloque angosto) se resumen en un menú
 * "⋯". Trae la semana completa (publicadas y canceladas).
 */
export function SessionCalendar({
  weekStart,
  onWeekChange,
  onOpenDatos,
  onOpenRoster,
  onOpenWaitlist,
  refreshKey = 0,
}: {
  weekStart: Date;
  onWeekChange: (weekStart: Date) => void;
  onOpenDatos: (sessionId: string) => void;
  onOpenRoster: (sessionId: string) => void;
  onOpenWaitlist: (sessionId: string) => void;
  /** Cambia (p. ej. tras crear sesión) para recargar la semana. */
  refreshKey?: number;
}) {
  const [sessions, setSessions] = useState<SessionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [delErr, setDelErr] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ id: string; left: number; top: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date(weekStart);
      const to = new Date(weekStart);
      to.setDate(to.getDate() + 7);
      to.setMilliseconds(-1);
      const acc: SessionDetail[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const data = await listSessions({
          from: from.toISOString(),
          to: to.toISOString(),
          page,
          pageSize: 100,
          order: 'asc',
          orderBy: 'startsAt',
        });
        acc.push(...data.items);
        hasMore = data.hasMore;
        page += 1;
      }
      setSessions(acc);
      setError(null);
    } catch (err) {
      setSessions([]);
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cargar el calendario',
      );
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    // Fetch remoto al cambiar semana.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga API
    void load();
  }, [load, refreshKey]);

  const today = new Date();
  const days: Date[] = [];
  for (let i = 0; i < 7; i += 1) {
    days.push(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));
  }

  const hours: number[] = [];
  for (let h = HOUR_START; h < HOUR_END; h += 1) {
    hours.push(h);
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const fmtDay = (d: Date) =>
    d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  const weekLabel = `${fmtDay(weekStart)} – ${fmtDay(weekEnd)} ${weekStart.getFullYear()}`;

  function shiftWeek(delta: number) {
    setMenu(null);
    const next = new Date(weekStart);
    next.setDate(next.getDate() + delta * 7);
    onWeekChange(next);
  }

  return (
    <div className="session-calendar">
      <div className="cal-nav">
        <button type="button" className="btn ghost" onClick={() => shiftWeek(-1)}>
          ‹
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setMenu(null);
            onWeekChange(startOfWeek(new Date()));
          }}
        >
          Hoy
        </button>
        <span className="cal-title">{weekLabel}</span>
        <button type="button" className="btn ghost" onClick={() => shiftWeek(1)}>
          ›
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {delErr ? <p className="err-msg">{delErr}</p> : null}
      {loading ? (
        <SkeletonTable rows={10} cols={8} />
      ) : (
        <div
          className="cal-week"
          style={
            {
              '--cal-body-h': `${(HOUR_END - HOUR_START) * PX_PER_HOUR}px`,
              '--cal-hour-h': `${PX_PER_HOUR}px`,
            } as CSSProperties
          }
        >
          <div className="cal-corner" />
          {days.map((d, i) => (
            <div
              key={`head-${d.getTime()}`}
              className={`cal-head${sameLocalDay(d, today) ? ' today' : ''}`}
            >
              <span className="cal-head-weekday">{WEEKDAYS[i]}</span>
              <span className="cal-head-daynum">{d.getDate()}</span>
            </div>
          ))}

          <div className="cal-gutter">
            {hours.map((h) => (
              <span
                key={h}
                className="cal-hour-label"
                style={{ top: (h - HOUR_START) * PX_PER_HOUR }}
              >
                {String(h).padStart(2, '0')}:00
              </span>
            ))}
          </div>

          {days.map((d) => {
            const daySessions = sessions.filter((s) =>
              sameLocalDay(new Date(s.startsAt), d),
            );
            return (
              <div
                key={`day-${d.getTime()}`}
                className={`cal-week-day${sameLocalDay(d, today) ? ' today' : ''}`}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className={`cal-hour${sameLocalDay(d, today) ? ' today' : ''}`}
                  />
                ))}
                {layoutDay(daySessions).map(({ s, left, width }) => {
                  const passed = new Date(s.startsAt).getTime() < Date.now();
                  const tone =
                    s.status === 'CANCELLED'
                      ? 'cancelled'
                      : passed
                        ? 'past'
                        : 'live';
                  const bs = blockStyle(s);
                  // La meta solo se muestra si el bloque es suficientemente alto
                  // y ancho (no se pisa ni se corta en sesiones cortas/superpuestas).
                  const showMeta = bs.height >= 54 && width >= 0.98;
                  return (
                    <div
                      key={s.id}
                      className={`cal-block ${tone}`}
                      style={{
                        ...bs,
                        left: `calc(${left}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                      }}
                    >
                      <div className="cal-block-top">
                        <span className="cal-block-time">
                          {timeLabel(s.startsAt)}
                        </span>
                        {tone === 'past' ? (
                          <span className="cal-pill">Pasó</span>
                        ) : null}
                        {s.status === 'CANCELLED' ? (
                          <span className="cal-pill">Cancelada</span>
                        ) : null}
                        <span className="cal-block-dots">
                          <RowIconButton
                            label="Acciones"
                            onClick={(e) => {
                              const r =
                                e.currentTarget.getBoundingClientRect();
                              setMenu(
                                menu?.id === s.id
                                  ? null
                                  : {
                                      id: s.id,
                                      left: Math.min(
                                        r.left,
                                        window.innerWidth - 190,
                                      ),
                                      top: Math.min(
                                        r.bottom,
                                        window.innerHeight - 200,
                                      ),
                                    },
                              );
                            }}
                          >
                            <IconDots />
                          </RowIconButton>
                        </span>
                      </div>
                      <button
                        type="button"
                        className="cal-block-name"
                        onClick={() => onOpenDatos(s.id)}
                      >
                        {s.serviceName}
                      </button>
                      {showMeta ? (
                        <div className="cal-block-meta">
                          {s.instructorName ?? 'Sin prof'} · {s.bookedCount}/{s.capacity}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {menu ? (
        <div className="cal-menu-backdrop" onClick={() => setMenu(null)} />
      ) : null}
      {menu ? (
        (() => {
          const menuSession = sessions.find((s) => s.id === menu.id);
          return menuSession ? (
            <div
              className="cal-block-menu"
              style={{ left: menu.left, top: menu.top }}
            >
              <SessionBlockActions
                session={menuSession}
                onDatos={onOpenDatos}
                onRoster={onOpenRoster}
                onWaitlist={onOpenWaitlist}
                onDeleted={() => {
                  setDelErr(null);
                  void load();
                }}
                onError={(err) => setDelErr(err.message)}
                onClose={() => setMenu(null)}
              />
            </div>
          ) : null;
        })()
      ) : null}
    </div>
  );
}