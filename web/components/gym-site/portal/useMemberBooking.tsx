'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ApiClientError } from '@/lib/api/client';
import {
  cancelMyReservation,
  getMyAccount,
  getMyGymMpConnected,
  joinWaitlist,
  leaveMyWaitlist,
  listMyReservations,
  listMyWaitlist,
  reserveSession,
  type MemberSessionSlot,
} from '@/lib/api/member-portal';
import type { MemberAccountDetail } from '@/lib/api/members';
import type { ReservationDetail } from '@/lib/api/reservations';
import type { WaitlistEntryDetail } from '@/lib/api/waitlist';
import { formatSessionWhen } from '@/lib/format-session';
import { dropInCartLine, useMemberCart } from '@/lib/member-cart';
import { useMemberArea } from './MemberArea';

export type BookingData = {
  account: MemberAccountDetail;
  reservations: ReservationDetail[];
  waitlist: WaitlistEntryDetail[];
  mpConnected: boolean;
};

type Notice = { tone: 'success' | 'error'; text: string };

type PendingConfirm = {
  kind: 'cancel' | 'leave';
  id: string;
  label: string;
};

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

/** Créditos restantes por servicio, sumando los packs vigentes. */
function creditsByService(account: MemberAccountDetail): Map<string, number> {
  const map = new Map<string, number>();
  for (const contract of account.contracts) {
    for (const b of contract.creditBalances) {
      map.set(b.serviceId, (map.get(b.serviceId) ?? 0) + b.remaining);
    }
  }
  return map;
}

/**
 * Reservas, lista de espera, créditos y carrito compartidos por el calendario,
 * «Mis clases» y el inicio (como `SessionBookingMixin` de la app).
 *
 * @remarks Con créditos del servicio reserva (CU-RES-001); sin créditos y con
 * drop-in, la clase va al carrito y se paga en Mercado Pago (CU-PAG-001).
 * Cancelar y salir de la espera piden confirmación (CU-RES-003 / CU-RES-004).
 */
export function useMemberBooking() {
  const { cartOwner } = useMemberArea();
  const cart = useMemberCart(cartOwner);
  const [data, setData] = useState<BookingData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [account, reservations, waitlist, mpConnected] =
          await Promise.all([
            getMyAccount(),
            listMyReservations(),
            listMyWaitlist(),
            getMyGymMpConnected(),
          ]);
        if (!cancelled) {
          setData({ account, reservations, waitlist, mpConnected });
          setLoadError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(errorText(err, 'No se pudo cargar tu cuenta'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const credits = useMemo(
    () => (data ? creditsByService(data.account) : new Map<string, number>()),
    [data],
  );

  function reservationFor(sessionId: string): ReservationDetail | undefined {
    return data?.reservations.find(
      (r) => r.sessionId === sessionId && r.status === 'CONFIRMED',
    );
  }

  function waitlistFor(sessionId: string): WaitlistEntryDetail | undefined {
    return data?.waitlist.find(
      (w) => w.sessionId === sessionId && w.status === 'WAITING',
    );
  }

  async function run(
    id: string,
    action: () => Promise<unknown>,
    success: string,
  ): Promise<void> {
    setBusyId(id);
    setNotice(null);
    try {
      await action();
      setNotice({ tone: 'success', text: success });
      reload();
    } catch (err) {
      setNotice({
        tone: 'error',
        text: errorText(err, 'Algo salió mal, intentá de nuevo'),
      });
    } finally {
      setBusyId(null);
    }
  }

  function addDropIn(session: MemberSessionSlot): void {
    const price = session.dropInPrice;
    if (!price || price < 1) {
      setNotice({
        tone: 'error',
        text: 'Esta clase no se vende suelta. Comprá un plan en la Tienda.',
      });
      return;
    }
    if (!data?.mpConnected) {
      setNotice({
        tone: 'error',
        text: 'El pago online no está disponible. Consultá en el gym.',
      });
      return;
    }
    const added = cart.add(dropInCartLine(session, price));
    setNotice(
      added
        ? { tone: 'success', text: 'Clase agregada al carrito.' }
        : { tone: 'error', text: 'Esta clase ya está en el carrito.' },
    );
  }

  async function reserve(session: MemberSessionSlot): Promise<void> {
    setBusyId(session.id);
    setNotice(null);
    try {
      await reserveSession(session.id);
      setNotice({ tone: 'success', text: 'Reserva confirmada.' });
      reload();
    } catch (err) {
      const message = errorText(err, 'No se pudo reservar');
      if (message.toLowerCase().includes('credit') && session.dropInPrice) {
        addDropIn(session);
      } else {
        setNotice({ tone: 'error', text: message });
      }
    } finally {
      setBusyId(null);
    }
  }

  function joinWait(session: MemberSessionSlot): Promise<void> {
    return run(
      session.id,
      () => joinWaitlist(session.id),
      'Estás en la lista de espera.',
    );
  }

  function askCancel(r: { id: string; serviceName: string; startsAt: string }) {
    setPending({
      kind: 'cancel',
      id: r.id,
      label: `${r.serviceName} · ${formatSessionWhen(r.startsAt)}`,
    });
  }

  function askLeave(w: WaitlistEntryDetail) {
    setPending({
      kind: 'leave',
      id: w.id,
      label: `${w.serviceName} · ${formatSessionWhen(w.sessionStartsAt)}`,
    });
  }

  async function confirmPending(): Promise<void> {
    if (!pending) {
      return;
    }
    const { kind, id } = pending;
    await (kind === 'cancel'
      ? run(id, () => cancelMyReservation(id), 'Reserva cancelada.')
      : run(id, () => leaveMyWaitlist(id), 'Saliste de la lista de espera.'));
    setPending(null);
  }

  return {
    data,
    loadError,
    /** Sube con cada recarga (p. ej. para refrescar cupos del calendario). */
    version: reloadKey,
    reload,
    busyId,
    notice,
    pending,
    cart,
    hasCredits: (serviceId: string) => (credits.get(serviceId) ?? 0) > 0,
    reservationFor,
    waitlistFor,
    reserve,
    addDropIn,
    joinWait,
    askCancel,
    askLeave,
    confirmPending,
    dismissPending: () => setPending(null),
  };
}

export type MemberBooking = ReturnType<typeof useMemberBooking>;

/** Aviso de la última acción y confirmación de cancelar / salir de la espera. */
export function BookingFeedback({ booking }: { booking: MemberBooking }) {
  const { notice, pending, busyId } = booking;
  return (
    <>
      {notice ? (
        <p className={notice.tone === 'success' ? 'success' : 'error'}>
          {notice.text}
        </p>
      ) : null}
      <ConfirmDialog
        open={pending !== null}
        title={
          pending?.kind === 'cancel'
            ? '¿Cancelar la reserva?'
            : '¿Salir de la lista de espera?'
        }
        description={pending?.label}
        confirmLabel={
          pending?.kind === 'cancel' ? 'Cancelar reserva' : 'Salir de la lista'
        }
        cancelLabel="No"
        tone="danger"
        busy={busyId !== null && busyId === pending?.id}
        onConfirm={() => void booking.confirmPending()}
        onCancel={booking.dismissPending}
      >
        <p className="muted">
          {pending?.kind === 'cancel'
            ? 'Liberás el cupo. Solo se puede cancelar dentro del plazo que fija el gym.'
            : 'Liberás tu lugar en la fila.'}
        </p>
      </ConfirmDialog>
    </>
  );
}
