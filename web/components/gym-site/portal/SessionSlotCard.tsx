'use client';

import type { MemberSessionSlot } from '@/lib/api/member-portal';
import { formatMoney } from '@/lib/cash-labels';
import { formatSessionRange } from '@/lib/format-session';
import type { MemberBooking } from './useMemberBooking';

type SlotAction = {
  label: string;
  onClick?: () => void;
  tone: 'primary' | 'ghost';
};

/**
 * Botón de la sesión con la misma prioridad que `MemberSessionCard` de la app:
 * reservada → en espera → llena → con créditos → drop-in → sin créditos.
 */
function slotAction(
  session: MemberSessionSlot,
  booking: MemberBooking,
): SlotAction {
  const reservation = booking.reservationFor(session.id);
  if (reservation) {
    return {
      label: 'Cancelar reserva',
      tone: 'ghost',
      onClick: () =>
        booking.askCancel({
          id: reservation.id,
          serviceName: session.serviceName,
          startsAt: session.startsAt,
        }),
    };
  }
  const entry = booking.waitlistFor(session.id);
  if (entry) {
    return {
      label: 'Salir de la lista',
      tone: 'ghost',
      onClick: () => booking.askLeave(entry),
    };
  }
  if (!session.hasSlots) {
    return {
      label: 'Anotarme en la lista de espera',
      tone: 'ghost',
      onClick: () => void booking.joinWait(session),
    };
  }
  if (booking.hasCredits(session.serviceId)) {
    return {
      label: 'Reservar',
      tone: 'primary',
      onClick: () => void booking.reserve(session),
    };
  }
  if (session.dropInPrice && session.dropInPrice > 0) {
    if (booking.cart.has('DROP_IN', session.id)) {
      return { label: 'En el carrito', tone: 'ghost' };
    }
    return {
      label: `Al carrito (${formatMoney(session.dropInPrice)})`,
      tone: 'primary',
      onClick: booking.data?.mpConnected
        ? () => booking.addDropIn(session)
        : undefined,
    };
  }
  return { label: 'Esta clase no se vende suelta', tone: 'ghost' };
}

/** Sesión del día con su estado y la acción que corresponde. */
export function SessionSlotCard({
  session,
  booking,
}: {
  session: MemberSessionSlot;
  booking: MemberBooking;
}) {
  const action = slotAction(session, booking);
  const reserved = Boolean(booking.reservationFor(session.id));
  const entry = booking.waitlistFor(session.id);
  const meta = [
    session.branchName,
    session.instructorName ? `Con ${session.instructorName}` : null,
    reserved
      ? 'Reservada'
      : entry
        ? entry.position
          ? `En espera · puesto ${entry.position}`
          : 'En espera'
        : session.hasSlots
          ? `${session.slotsLeft} ${session.slotsLeft === 1 ? 'cupo' : 'cupos'}`
          : 'Llena',
  ].filter(Boolean);

  return (
    <li className={`portal-slot${reserved ? ' is-reserved' : ''}`}>
      <div>
        <p className="portal-slot-when">
          {formatSessionRange(session.startsAt, session.endsAt)}
        </p>
        <p className="portal-slot-name">{session.serviceName}</p>
        <p className="muted small">{meta.join(' · ')}</p>
      </div>
      <button
        type="button"
        className={action.tone === 'primary' ? 'btn primary' : 'btn ghost'}
        disabled={!action.onClick || booking.busyId === session.id}
        onClick={action.onClick}
      >
        {booking.busyId === session.id ? 'Procesando…' : action.label}
      </button>
    </li>
  );
}
