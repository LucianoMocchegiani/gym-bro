'use client';

import Link from 'next/link';
import type { ContractDetail } from '@/lib/api/contracts';
import { CheckList } from '@/components/marketing/CheckList';
import { formatSessionWhen } from '@/lib/format-session';
import { MemberArea, useMemberArea } from './portal/MemberArea';
import { BookingFeedback, useMemberBooking } from './portal/useMemberBooking';

/** Vuelta de Mercado Pago: `?compra={transactionId}&status=…`. */
export type PurchaseReturn = { id: string; status: string | null };

const UPCOMING_ON_HOME = 3;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR');
}

function contractItems(c: ContractDetail): string[] {
  const items = c.creditBalances.map(
    (b) => `${b.remaining} ${b.remaining === 1 ? 'clase' : 'clases'} de ${b.serviceName}`,
  );
  if (c.hasAccessLibre) {
    items.unshift('Acceso libre');
  }
  items.push(c.endsAt ? `Vence el ${formatDate(c.endsAt)}` : 'Sin vencimiento');
  return items;
}

function PurchaseBanner({ purchase }: { purchase: PurchaseReturn }) {
  if (purchase.status === 'approved') {
    return (
      <p className="success">
        Pago aprobado. Tus planes y clases aparecen acá apenas Mercado Pago lo
        acredita (unos segundos).
      </p>
    );
  }
  if (purchase.status === 'pending' || purchase.status === 'in_process') {
    return (
      <p className="muted">
        El pago quedó pendiente. Cuando Mercado Pago lo apruebe, se activa solo.
      </p>
    );
  }
  return (
    <p className="error">
      El pago no se completó. Podés intentarlo de nuevo desde el carrito.
    </p>
  );
}

/** Inicio del portal: planes vigentes, próximas reservas y accesos. */
function MemberHome({ purchase }: { purchase: PurchaseReturn | null }) {
  const { session } = useMemberArea();
  const booking = useMemberBooking();
  const account = booking.data?.account ?? null;
  const upcoming = account?.reservations.slice(0, UPCOMING_ON_HOME) ?? [];

  return (
    <>
      <section className="mkt-inner mkt-section">
        <p className="eyebrow">Mi cuenta</p>
        <h2 className="mkt-h2">Hola, {session.name ?? session.email}</h2>
        {purchase ? <PurchaseBanner purchase={purchase} /> : null}
        {booking.loadError ? (
          <p className="error">{booking.loadError}</p>
        ) : null}
        <BookingFeedback booking={booking} />
        <div className="mkt-hero-actions">
          <Link className="mkt-btn-primary" href="/portal/clases">
            Reservar una clase
          </Link>
          <Link className="mkt-btn-ghost" href="/portal/tienda">
            Ver planes
          </Link>
          <button
            type="button"
            className="mkt-btn-ghost"
            onClick={booking.reload}
          >
            Actualizar
          </button>
        </div>
      </section>

      <section className="mkt-inner mkt-section">
        <h2 className="mkt-h2">Próximas clases</h2>
        {!account ? (
          <p className="muted">Cargando…</p>
        ) : upcoming.length === 0 ? (
          <p className="muted">
            No tenés clases reservadas.{' '}
            <Link href="/portal/clases">Ver el calendario</Link>
          </p>
        ) : (
          <>
            <ul className="portal-slots">
              {upcoming.map((r) => (
                <li key={r.id} className="portal-slot is-reserved">
                  <div>
                    <p className="portal-slot-when">
                      {formatSessionWhen(r.startsAt)}
                    </p>
                    <p className="portal-slot-name">{r.serviceName}</p>
                  </div>
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={booking.busyId === r.id}
                    onClick={() => booking.askCancel(r)}
                  >
                    Cancelar reserva
                  </button>
                </li>
              ))}
            </ul>
            <p className="small">
              <Link href="/portal/mis-clases">Ver todas mis clases</Link>
            </p>
          </>
        )}
      </section>

      <section className="mkt-inner mkt-section">
        <h2 className="mkt-h2">Tus planes vigentes</h2>
        {!account ? (
          <p className="muted">Cargando…</p>
        ) : account.contracts.length === 0 ? (
          <p className="muted">
            No tenés planes vigentes.{' '}
            <Link href="/portal/tienda">Ver planes</Link>
          </p>
        ) : (
          <div className="mkt-plans">
            {account.contracts.map((c) => (
              <div key={c.id} className="mkt-plan">
                <h3>{c.packName}</h3>
                <CheckList items={contractItems(c)} />
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/**
 * Inicio del portal del socio en la web del gym (`/portal`), con el resultado
 * del pago si vuelve de Mercado Pago.
 */
export function MemberPortal({
  slug,
  purchase,
}: {
  slug: string;
  purchase: PurchaseReturn | null;
}) {
  return (
    <MemberArea slug={slug}>
      <MemberHome purchase={purchase} />
    </MemberArea>
  );
}
