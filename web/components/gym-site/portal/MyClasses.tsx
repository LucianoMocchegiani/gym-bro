'use client';

import Link from 'next/link';
import { StatusPill } from '@/components/StatusPill';
import type { ReservationDetail } from '@/lib/api/reservations';
import { formatSessionRange, formatSessionWhen } from '@/lib/format-session';
import { BookingFeedback, useMemberBooking } from './useMemberBooking';

function coverageLabel(r: ReservationDetail): string {
  return r.coverage === 'DROP_IN' ? 'Clase suelta' : 'Crédito';
}

/**
 * «Mis clases» (CU-RES-003 / CU-RES-004): próximas reservas y lista de espera
 * con cancelar / salir, y debajo las pasadas o canceladas.
 */
export function MyClasses() {
  const booking = useMemberBooking();
  const { data } = booking;

  if (!data) {
    return (
      <section className="mkt-inner mkt-section">
        {booking.loadError ? (
          <p className="error">{booking.loadError}</p>
        ) : (
          <p className="muted">Cargando tus clases…</p>
        )}
      </section>
    );
  }

  const upcomingIds = new Set(data.account.reservations.map((r) => r.id));
  const upcoming = data.reservations
    .filter((r) => upcomingIds.has(r.id))
    .sort((a, b) => a.sessionStartsAt.localeCompare(b.sessionStartsAt));
  const past = data.reservations.filter((r) => !upcomingIds.has(r.id));

  return (
    <section className="mkt-inner mkt-section">
      <p className="eyebrow">Mis clases</p>
      <h2 className="mkt-h2">Tus reservas</h2>
      <BookingFeedback booking={booking} />

      {upcoming.length === 0 && data.waitlist.length === 0 ? (
        <p className="muted">
          Todavía no tenés clases reservadas ni en espera.{' '}
          <Link href="/portal/clases">Reservá una clase</Link>
        </p>
      ) : (
        <ul className="portal-slots">
          {upcoming.map((r) => (
            <li key={r.id} className="portal-slot is-reserved">
              <div>
                <p className="portal-slot-when">
                  {formatSessionRange(r.sessionStartsAt, r.sessionEndsAt)}
                </p>
                <p className="portal-slot-name">{r.serviceName}</p>
                <p className="muted small">Reservada · {coverageLabel(r)}</p>
              </div>
              <button
                type="button"
                className="btn ghost"
                disabled={booking.busyId === r.id}
                onClick={() =>
                  booking.askCancel({
                    id: r.id,
                    serviceName: r.serviceName,
                    startsAt: r.sessionStartsAt,
                  })
                }
              >
                Cancelar reserva
              </button>
            </li>
          ))}
          {data.waitlist.map((w) => (
            <li key={w.id} className="portal-slot">
              <div>
                <p className="portal-slot-when">
                  {formatSessionRange(w.sessionStartsAt, w.sessionEndsAt)}
                </p>
                <p className="portal-slot-name">{w.serviceName}</p>
                <p className="muted small">
                  En lista de espera
                  {w.position ? ` · puesto ${w.position}` : ''}
                </p>
              </div>
              <button
                type="button"
                className="btn ghost"
                disabled={booking.busyId === w.id}
                onClick={() => booking.askLeave(w)}
              >
                Salir de la lista
              </button>
            </li>
          ))}
        </ul>
      )}

      {past.length > 0 ? (
        <>
          <h3 className="portal-day-title">Pasadas y canceladas</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Clase</th>
                  <th>Fecha</th>
                  <th>Pago</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {past.map((r) => (
                  <tr key={r.id}>
                    <td>{r.serviceName}</td>
                    <td>{formatSessionWhen(r.sessionStartsAt)}</td>
                    <td>{coverageLabel(r)}</td>
                    <td>
                      {r.status === 'CANCELLED' ? (
                        <StatusPill tone="muted">Cancelada</StatusPill>
                      ) : (
                        <StatusPill tone="ok">Pasada</StatusPill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
