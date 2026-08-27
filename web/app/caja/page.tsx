'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ListToolbar } from '@/components/AdminList';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { MemberPicker } from '@/components/MemberPicker';
import { ReceiptPanel } from '@/components/ReceiptPanel';
import { RequireStaff } from '@/components/RequireStaff';
import { SkeletonPanel } from '@/components/Skeleton';
import { ApiClientError, newIdempotencyKey } from '@/lib/api/client';
import { createCashContract } from '@/lib/api/contracts';
import {
  pickMpCartCheckoutUrl,
  startStaffMpCartCheckout,
} from '@/lib/api/mercadopago';
import { listActivePacks } from '@/lib/api/packs';
import type { PackSummary } from '@/lib/api/packs';
import { createCashDropIn } from '@/lib/api/reservations';
import { getReceiptByPayment } from '@/lib/api/receipts';
import type { ReceiptDetail } from '@/lib/api/receipts';
import { listSessions } from '@/lib/api/sessions';
import type { SessionSummary } from '@/lib/api/sessions';
import { listServices } from '@/lib/api/services';
import { formatMoney } from '@/lib/cash-labels';

type CartItem = {
  key: string;
  kind: 'PACK' | 'DROP_IN';
  refId: string;
  label: string;
  sub: string;
  price: number;
};

type CatalogTab = 'SERVICIOS' | 'PACKS';

/**
 * Caja: carrito de cobros (packs + drop-in) en efectivo o con links de MP
 * (CU-PAG / RN-PAG-009). Cierre y movimientos viven en /arqueo.
 */
export default function CajaPage() {
  return (
    <RequireStaff>
      <CajaInner />
    </RequireStaff>
  );
}

function CajaInner() {
  const [catalogTab, setCatalogTab] = useState<CatalogTab>('SERVICIOS');
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [services, setServices] = useState<
    { id: string; dropInPrice: number | null }[]
  >([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [memberId, setMemberId] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cobroMedio, setCobroMedio] = useState<'CASH' | 'MP'>('CASH');
  const [cobroBusy, setCobroBusy] = useState(false);
  const [cobroError, setCobroError] = useState<string | null>(null);
  const [cobroOk, setCobroOk] = useState<string | null>(null);
  const [mpCheckoutUrl, setMpCheckoutUrl] = useState<string | null>(null);
  const [copyKey, setCopyKey] = useState<string | null>(null);

  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const itemSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const from = new Date();
        const to = new Date();
        to.setDate(to.getDate() + 14);
        const [packsResult, sessionsResult, servicesResult] = await Promise.all([
          listActivePacks(),
          listSessions({
            status: 'PUBLISHED',
            from: from.toISOString(),
            to: to.toISOString(),
            pageSize: 100,
          }),
          listServices({ active: true, pageSize: 100 }),
        ]);
        if (cancelled) {
          return;
        }
        setPacks(packsResult.items);
        setSessions(sessionsResult.items);
        setServices(
          servicesResult.items.map((s) => ({
            id: s.id,
            dropInPrice: s.dropInPrice,
          })),
        );
        setCatalogError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setCatalogError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar el catálogo de cobro',
        );
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const servicePrice = useMemo(
    () => new Map(services.map((s) => [s.id, s.dropInPrice])),
    [services],
  );

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price, 0),
    [cart],
  );

  function addPack(pack: PackSummary) {
    const key = `PACK-${pack.id}-${++itemSeq.current}`;
    setCart((prev) => [
      ...prev,
      {
        key,
        kind: 'PACK',
        refId: pack.id,
        label: pack.name,
        sub:
          pack.kind === 'ACCESS'
            ? 'Acceso libre'
            : pack.kind === 'CREDITS'
              ? 'Créditos'
              : 'Mixto',
        price: pack.price,
      },
    ]);
  }

  function addDropIn(session: SessionSummary) {
    const price = servicePrice.get(session.serviceId) ?? 0;
    const when = new Date(session.startsAt).toLocaleString('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const key = `DROP_IN-${session.id}-${++itemSeq.current}`;
    setCart((prev) => [
      ...prev,
      {
        key,
        kind: 'DROP_IN',
        refId: session.id,
        label: session.serviceName,
        sub: `${when} · ${session.branchName} (${session.bookedCount}/${session.capacity})`,
        price,
      },
    ]);
  }

  function removeItem(key: string) {
    setCart((prev) => prev.filter((item) => item.key !== key));
  }

  async function openReceiptForPayment(paymentId: string) {
    setReceiptError(null);
    try {
      const r = await getReceiptByPayment(paymentId);
      setReceipt(r);
    } catch (err) {
      setReceipt(null);
      setReceiptError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cargar el comprobante',
      );
    }
  }

  async function copyMpUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopyKey(url);
      window.setTimeout(() => setCopyKey(null), 2000);
    } catch {
      setCobroError('No se pudo copiar el link');
    }
  }

  async function onCobro(e: FormEvent) {
    e.preventDefault();
    if (!memberId) {
      setCobroError('Elegí un afiliado');
      return;
    }
    if (cart.length === 0) {
      setCobroError('Agregá al menos un ítem al carrito');
      return;
    }
    setCobroBusy(true);
    setCobroError(null);
    setCobroOk(null);
    setMpCheckoutUrl(null);
    setCopyKey(null);
    setReceiptError(null);
    setReceipt(null);
    try {
      if (cobroMedio === 'MP') {
        const result = await startStaffMpCartCheckout(memberId, {
          items: cart.map((item) => ({
            kind: item.kind,
            id: item.refId,
          })),
          idempotencyKey: newIdempotencyKey('mp-cart'),
        });
        const url = pickMpCartCheckoutUrl(result);
        if (!url) {
          throw new Error(
            'Checkout creado sin URL (revisá cuenta MP / modo)',
          );
        }
        setMpCheckoutUrl(url);
        setCobroOk(
          `Link MP generado por ${formatMoney(result.amount)}. Cada pack/reserva del carrito se activa al aprobarse el pago.`,
        );
        window.open(url, '_blank', 'noopener,noreferrer');
        setCart([]);
        return;
      }

      const paymentIds: string[] = [];
      const labels: string[] = [];
      for (const item of cart) {
        if (item.kind === 'PACK') {
          const contract = await createCashContract(
            memberId,
            item.refId,
            newIdempotencyKey('cash-pack'),
          );
          paymentIds.push(contract.payment.id);
        } else {
          const reservation = await createCashDropIn(
            memberId,
            item.refId,
            newIdempotencyKey('cash-dropin'),
          );
          if (reservation.paymentId) {
            paymentIds.push(reservation.paymentId);
          }
        }
        labels.push(item.label);
      }
      setCart([]);
      setCobroOk(
        `${labels.length} cobro${labels.length === 1 ? '' : 's'} en efectivo: ${labels.join(' · ')}`,
      );
      const last = paymentIds[paymentIds.length - 1];
      if (last) {
        await openReceiptForPayment(last);
      }
    } catch (err) {
      setCobroError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No se pudo registrar el cobro',
      );
    } finally {
      setCobroBusy(false);
    }
  }

  return (
    <AdminShell
      title="Caja"
      subtitle="Cobros con carrito: packs y drop-in en efectivo o Mercado Pago."
    >
      <ListToolbar hint="Movimientos y cierre del día se ven en Cierres y Movimientos. MP no suma al cierre de efectivo.">
        <MemberPicker
          label="Afiliado"
          value={memberId}
          onChange={setMemberId}
          placeholder="Buscar por nombre o email…"
          autoFocus
        />
      </ListToolbar>

      {receiptError ? <p className="error">{receiptError}</p> : null}

      {receipt ? (
        <ReceiptPanel
          receipt={receipt}
          title="Comprobante emitido"
          onClose={() => setReceipt(null)}
        />
      ) : null}

      <div className="cash-layout">
        <Panel
          title="Catálogo"
          description="Agregá ítems al carrito con el botón +."
        >
          <div className="cash-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={catalogTab === 'SERVICIOS'}
              className={catalogTab === 'SERVICIOS' ? 'active' : undefined}
              onClick={() => setCatalogTab('SERVICIOS')}
            >
              Servicios
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={catalogTab === 'PACKS'}
              className={catalogTab === 'PACKS' ? 'active' : undefined}
              onClick={() => setCatalogTab('PACKS')}
            >
              Packs
            </button>
          </div>

          {catalogError ? <p className="error">{catalogError}</p> : null}

          {catalogLoading ? <SkeletonPanel lines={5} /> : null}

          {!catalogLoading && catalogTab === 'SERVICIOS' ? (
            sessions.length === 0 ? (
              <p className="muted small">
                Sin sesiones publicadas en los próximos 14 días.
              </p>
            ) : (
              <ul className="plain-list">
                {sessions.map((s) => {
                  const price = servicePrice.get(s.serviceId);
                  return (
                    <li key={s.id} className="catalog-row">
                      <div>
                        <p className="catalog-name">{s.serviceName}</p>
                        <p className="muted small">
                          {new Date(s.startsAt).toLocaleString('es-AR', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {' · '}
                          {s.branchName} ({s.bookedCount}/{s.capacity})
                        </p>
                        <p className="small">
                          {price === null || price === undefined ? (
                            <span className="muted">
                              Sin precio de drop-in configurado
                            </span>
                          ) : (
                            formatMoney(price)
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="catalog-add"
                        title={
                          price === null || price === undefined
                            ? 'Configurá el precio de drop-in del servicio para poder cobrarlo'
                            : 'Agregar al carrito'
                        }
                        aria-label={`Agregar ${s.serviceName} al carrito`}
                        disabled={price === null || price === undefined}
                        onClick={() => addDropIn(s)}
                      >
                        +
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : null}

          {!catalogLoading && catalogTab === 'PACKS' ? (
            packs.length === 0 ? (
              <p className="muted small">Sin packs activos.</p>
            ) : (
              <ul className="plain-list">
                {packs.map((p) => (
                  <li key={p.id} className="catalog-row">
                    <div>
                      <p className="catalog-name">{p.name}</p>
                      <p className="muted small">
                        {p.kind === 'ACCESS'
                          ? 'Acceso libre'
                          : p.kind === 'CREDITS'
                            ? 'Créditos'
                            : 'Mixto'}{' '}
                        · {formatMoney(p.price)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="catalog-add"
                      title="Agregar al carrito"
                      aria-label={`Agregar ${p.name} al carrito`}
                      onClick={() => addPack(p)}
                    >
                      +
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </Panel>

        <Panel
          title="Carrito"
          description={
            memberId
              ? 'Ítems a cobrar'
              : 'Elegí el afiliado para habilitar el cobro.'
          }
          className="cash-cart"
        >
          {cart.length === 0 ? (
            <p className="muted small">Carrito vacío. Agregá servicios o packs.</p>
          ) : (
            <>
              <ul className="plain-list">
                {cart.map((item) => (
                  <li key={item.key} className="cart-line">
                    <div>
                      <p className="cart-name">{item.label}</p>
                      <p className="muted small">{item.sub}</p>
                      <p className="small">
                        {item.price === 0 ? (
                          <span className="muted">Sin precio</span>
                        ) : (
                          formatMoney(item.price)
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="cart-remove"
                      title="Quitar del carrito"
                      aria-label={`Quitar ${item.label} del carrito`}
                      onClick={() => removeItem(item.key)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <div className="cart-total">
                <span>Total</span>
                <strong>{formatMoney(total)}</strong>
              </div>
            </>
          )}

          <form className="admin-form" onSubmit={(e) => void onCobro(e)}>
            <fieldset className="mode-toggle">
              <legend>Medio</legend>
              <label>
                <input
                  type="radio"
                  name="medio"
                  checked={cobroMedio === 'CASH'}
                  onChange={() => setCobroMedio('CASH')}
                />
                Efectivo (suma al cierre)
              </label>
              <label>
                <input
                  type="radio"
                  name="medio"
                  checked={cobroMedio === 'MP'}
                  onChange={() => setCobroMedio('MP')}
                />
                Mercado Pago (link único)
              </label>
            </fieldset>

            {cobroMedio === 'MP' ? (
              <p className="muted small">
                Se genera un solo link con el total del carrito (como Mercado
                Libre: 1 carrito → 1 pago). Cada pack/reserva se activa al
                aprobarse el pago (webhook). Requiere cuenta MP en Config.
              </p>
            ) : null}

            {cobroError ? <p className="error">{cobroError}</p> : null}
            {cobroOk ? <p className="ok-msg">{cobroOk}</p> : null}

            {mpCheckoutUrl ? (
              <div className="cart-line">
                <div>
                  <p className="cart-name">Link de pago MP</p>
                  <p className="muted small mp-link-url">{mpCheckoutUrl}</p>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() =>
                      window.open(mpCheckoutUrl, '_blank', 'noopener,noreferrer')
                    }
                  >
                    Abrir
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => void copyMpUrl(mpCheckoutUrl)}
                  >
                    {copyKey === mpCheckoutUrl ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="row-actions cart-actions">
              {cart.length > 0 ? (
                <button
                  type="button"
                  className="linkish"
                  onClick={() => setCart([])}
                  disabled={cobroBusy}
                >
                  Vaciar carrito
                </button>
              ) : (
                <span />
              )}
              <button
                type="submit"
                className="primary"
                disabled={cobroBusy || cart.length === 0 || !memberId}
                title={
                  !memberId
                    ? 'Elegí el afiliado de la lista de búsqueda'
                    : cart.length === 0
                      ? 'Agregá al menos un ítem al carrito'
                      : undefined
                }
              >
                {cobroBusy
                  ? cobroMedio === 'MP'
                    ? 'Generando link…'
                    : 'Cobrando…'
                  : cobroMedio === 'MP'
                    ? 'Generar link MP'
                    : `Cobrar en efectivo${cart.length > 1 ? ` (${cart.length})` : ''}`}
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </AdminShell>
  );
}