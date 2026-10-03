'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ApiClientError } from '@/lib/api/client';
import {
  listMySessionsInRange,
  type MemberSessionSlot,
} from '@/lib/api/member-portal';
import { MonthCalendar, startOfMonth } from './MonthCalendar';
import { SessionSlotCard } from './SessionSlotCard';
import { BookingFeedback, useMemberBooking } from './useMemberBooking';

/** Del mes visible: desde ahora (si es el actual) hasta su último instante. */
function monthRange(month: Date): { from: Date; to: Date } {
  const now = new Date();
  const from = month > now ? month : now;
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  to.setMilliseconds(-1);
  return { from, to };
}

/**
 * Calendario de clases del socio (CU-RES-001 / CU-RES-004): mes → día →
 * sesiones, con reservar, carrito o lista de espera según créditos y cupo.
 */
export function MemberClasses() {
  const booking = useMemberBooking();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [sessions, setSessions] = useState<MemberSessionSlot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { from, to } = monthRange(month);
        const items = await listMySessionsInRange(from, to);
        if (!cancelled) {
          setSessions(items);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'No se pudieron cargar las clases',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month, booking.version]);

  const byDay = useMemo(() => {
    const map = new Map<number, MemberSessionSlot[]>();
    for (const s of sessions ?? []) {
      const start = new Date(s.startsAt);
      if (start.getMonth() !== month.getMonth()) {
        continue;
      }
      const day = start.getDate();
      map.set(day, [...(map.get(day) ?? []), s]);
    }
    return map;
  }, [sessions, month]);

  const firstDayWithSessions = byDay.size > 0 ? Math.min(...byDay.keys()) : null;
  const day = selectedDay ?? firstDayWithSessions;
  const daySessions = day ? (byDay.get(day) ?? []) : [];
  const dayLabel = day
    ? new Date(month.getFullYear(), month.getMonth(), day).toLocaleDateString(
        'es-AR',
        { weekday: 'long', day: 'numeric', month: 'long' },
      )
    : null;

  function shiftMonth(delta: number) {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
    setSessions(null);
    setSelectedDay(null);
  }

  return (
    <section className="mkt-inner mkt-section">
      <p className="eyebrow">Clases</p>
      <h2 className="mkt-h2">Reservá tu clase</h2>
      <p className="muted">
        Con créditos de tu plan reservás al toque. Si no tenés, sumás la clase
        suelta al carrito y la pagás con Mercado Pago.
      </p>
      <BookingFeedback booking={booking} />
      {booking.loadError ? <p className="error">{booking.loadError}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="portal-classes">
        <MonthCalendar
          month={month}
          daysWithSessions={new Set(byDay.keys())}
          selectedDay={day}
          onShiftMonth={shiftMonth}
          onSelectDay={setSelectedDay}
        />
        <div>
          {!sessions || !booking.data ? (
            <p className="muted">Cargando clases…</p>
          ) : !day ? (
            <p className="muted">No hay clases publicadas este mes.</p>
          ) : (
            <>
              <h3 className="portal-day-title">{dayLabel}</h3>
              {daySessions.length === 0 ? (
                <p className="muted">No hay clases este día.</p>
              ) : (
                <ul className="portal-slots">
                  {daySessions.map((s) => (
                    <SessionSlotCard key={s.id} session={s} booking={booking} />
                  ))}
                </ul>
              )}
            </>
          )}
          {booking.cart.count > 0 ? (
            <p className="small">
              <Link href="/cuenta/carrito">
                Ir al carrito ({booking.cart.count})
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
