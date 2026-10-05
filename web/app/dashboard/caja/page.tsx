'use client';

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CajaDebitPanel } from '@/components/CajaDebitPanel';
import { CartLineList } from '@/components/CartLineList';
import { ListToolbar } from '@/components/AdminList';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { MemberPicker } from '@/components/MemberPicker';
import { TenantPicker } from '@/components/TenantPicker';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MpCheckoutShare } from '@/components/MpCheckoutShare';
import { ReceiptPanel } from '@/components/ReceiptPanel';
import { IconReceipt } from '@/components/RowActions';
import { RequireStaff } from '@/components/RequireStaff';
import { SkeletonPanel } from '@/components/Skeleton';
import { ApiClientError, newIdempotencyKey } from '@/lib/api/client';
import { enrollDebitMandate } from '@/lib/api/debit';
import {
  pickMpCartCheckoutUrl,
  startStaffMpCartCheckout,
} from '@/lib/api/mercadopago';
import { getMember } from '@/lib/api/members';
import {
  startPlatformCashCart,
  startPlatformMpCartCheckout,
} from '@/lib/api/tenants';
import { extractTenantSlugFromHost } from '@/lib/tenant-host';
import { listActivePacks } from '@/lib/api/packs';
import type { PackSummary } from '@/lib/api/packs';
import { startCashCart } from '@/lib/api/reservations';
import {
  applyDiscount,
  getCashDiscountDefaults,
} from '@/lib/api/cash-discount';
import type {
  CashDiscountDefaults,
  CounterChargeOptions,
  CounterMethod,
} from '@/lib/api/cash-discount';
import { getPlatformTrialEligibility } from '@/lib/api/plan';
import { getReceiptByTransaction } from '@/lib/api/receipts';
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
type CajaVista = 'cobro' | 'debitos';

/**
 * Caja: carrito de cobros (packs + drop-in) en efectivo o con links de MP
 * (CU-PAG / RN-PAG-009). Cierre y movimientos viven en /arqueo.
 *
 * @remarks MP no redirige al checkout: muestra el link y hace polling del
 * comprobante hasta el webhook APPROVED. CASH muestra el comprobante al
 * instante (el cobro ya queda APPROVED). Débito: Card Brick + mandato (CU-PAG-008).
 */
export default function CajaPage() {
  return (
    <RequireStaff>
      <Suspense fallback={<AdminShell title="Caja" subtitle="Cargando…"><SkeletonPanel lines={6} /></AdminShell>}>
        <CajaInner />
      </Suspense>
    </RequireStaff>
  );
}

function CajaInner() {
  const searchParams = useSearchParams();
  // El host decide si esta es la Caja de plataforma (RequireStaff ya.validó la
  // sesión contra el host, así que `session.tenantSlug` sería redundante).
  const isPlatform =
    typeof window !== 'undefined' &&
    extractTenantSlugFromHost(window.location.host) === 'admin';
  const initialMemberId = searchParams.get('memberId')?.trim() ?? '';
  const initialBillingTenantId =
    searchParams.get('billingTenantId')?.trim() ?? '';
  const initialVista =
    searchParams.get('vista') === 'debitos' ? 'debitos' : 'cobro';

  const [vista, setVista] = useState<CajaVista>(initialVista);
  const [catalogTab, setCatalogTab] = useState<CatalogTab>(
    isPlatform ? 'PACKS' : 'SERVICIOS',
  );
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [services, setServices] = useState<
    { id: string; dropInPrice: number | null }[]
  >([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  /** Tenant facturado en la Caja de plataforma (solo `slug === 'admin'`). */
  const [billingTenantId, setBillingTenantId] = useState(initialBillingTenantId);
  const [billingTenantLabel, setBillingTenantLabel] = useState('');
  /** Afiliado cobrador (solo tenants con `slug !== 'admin'`). */
  const [memberId, setMemberId] = useState(initialMemberId);
  const [memberLabel, setMemberLabel] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cobroMedio, setCobroMedio] = useState<CounterMethod | 'MP'>('CASH');
  const [discountDefaults, setDiscountDefaults] =
    useState<CashDiscountDefaults | null>(null);
  const [discountInput, setDiscountInput] = useState('0');
  const [transferReference, setTransferReference] = useState('');
  const [counterDoneLabel, setCounterDoneLabel] = useState('');
  const [debitWanted, setDebitWanted] = useState(false);
  const [debitPayerEmail, setDebitPayerEmail] = useState('');
  const [applyTrial, setApplyTrial] = useState(false);
  const [trialEligible, setTrialEligible] = useState(false);
  const [trialHint, setTrialHint] = useState<string | null>(null);
  const [cobroBusy, setCobroBusy] = useState(false);
  const [cobroError, setCobroError] = useState<string | null>(null);
  const [cobroOk, setCobroOk] = useState<string | null>(null);
  const [mpCheckoutUrl, setMpCheckoutUrl] = useState<string | null>(null);
  const [mpTransactionId, setMpTransactionId] = useState<string | null>(null);
  const [mpApproved, setMpApproved] = useState(false);
  const [copyKey, setCopyKey] = useState<string | null>(null);
  const [mpClearConfirm, setMpClearConfirm] = useState(false);
  const [cashTransactionId, setCashTransactionId] = useState<string | null>(
    null,
  );

  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const itemSeq = useRef(0);

  useEffect(() => {
    if (isPlatform || !initialMemberId) {
      return;
    }
    void getMember(initialMemberId)
      .then((m) => setMemberLabel(m.name?.trim() || m.email))
      .catch(() => undefined);
  }, [initialMemberId, isPlatform]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (isPlatform) {
          // La Caja de plataforma vende packs: sin sesiones ni drop-in.
          const packsResult = await listActivePacks();
          if (cancelled) {
            return;
          }
          setPacks(packsResult.items);
          setSessions([]);
          setServices([]);
          setCatalogError(null);
          return;
        }
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
  }, [isPlatform]);

  useEffect(() => {
    let cancelled = false;
    void getCashDiscountDefaults()
      .then((d) => {
        if (cancelled) {
          return;
        }
        setDiscountDefaults(d);
        setDiscountInput(String(d.cashDiscountPercent));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isPlatform || !billingTenantId) {
      setTrialEligible(false);
      setTrialHint(null);
      setApplyTrial(false);
      return;
    }
    let cancelled = false;
    void getPlatformTrialEligibility(billingTenantId)
      .then((r) => {
        if (cancelled) {
          return;
        }
        setTrialEligible(r.eligible);
        setTrialHint(r.reason);
        if (!r.eligible) {
          setApplyTrial(false);
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setTrialEligible(false);
        setTrialHint('No se pudo consultar la prueba');
        setApplyTrial(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isPlatform, billingTenantId]);

  useEffect(() => {
    if (!receipt) {
      return;
    }
    document.getElementById('receipt-panel')?.scrollIntoView({ behavior: 'smooth' });
  }, [receipt]);

  useEffect(() => {
    if (!mpTransactionId || mpApproved) {
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await getReceiptByTransaction(mpTransactionId);
        if (cancelled) {
          return;
        }
        setMpApproved(true);
        setReceipt(r);
      } catch {
        // PENDING: el webhook aún no emitió el comprobante
      }
    };
    void tick();
    const interval = window.setInterval(() => {
      void tick();
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [mpTransactionId, mpApproved]);

  const servicePrice = useMemo(
    () => new Map(services.map((s) => [s.id, s.dropInPrice])),
    [services],
  );

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price, 0),
    [cart],
  );

  const trialPackOffers =
    cart.length === 1 &&
    cart[0]?.kind === 'PACK' &&
    packs.find((p) => p.id === cart[0].refId)?.offersPlatformTrial !== false;

  const trialCanApply = Boolean(
    isPlatform && cobroMedio === 'CASH' && trialEligible && trialPackOffers,
  );

  const trialApplied = applyTrial && trialCanApply;
  const isCounter = cobroMedio !== 'MP';
  const discountPercent = Number(discountInput.replace(',', '.'));
  const discountValid =
    Number.isFinite(discountPercent) &&
    discountPercent >= 0 &&
    discountPercent <= 99;
  const discountActive =
    isCounter && !trialApplied && discountValid && discountPercent > 0;
  const chargeTotal = trialApplied
    ? 0
    : discountActive
      ? cart.reduce(
          (sum, item) => sum + applyDiscount(item.price, discountPercent),
          0,
        )
      : total;

  function chooseMedio(medio: CounterMethod | 'MP') {
    setCobroMedio(medio);
    if (medio === 'CASH') {
      setDiscountInput(String(discountDefaults?.cashDiscountPercent ?? 0));
    } else if (medio === 'TRANSFER') {
      setDiscountInput(String(discountDefaults?.transferDiscountPercent ?? 0));
    }
  }

  const debitEligible = useMemo(() => {
    // El débito es un mandato por afiliado; no aplica a la venta de plataforma.
    if (isPlatform) {
      return false;
    }
    if (cobroMedio !== 'MP' || cart.length !== 1 || cart[0].kind !== 'PACK') {
      return false;
    }
    const pack = packs.find((p) => p.id === cart[0].refId);
    return pack?.billingPeriod === 'MONTHLY';
  }, [cart, cobroMedio, isPlatform, packs]);

  useEffect(() => {
    if (!trialCanApply) {
      setApplyTrial(false);
    }
  }, [trialCanApply]);

  useEffect(() => {
    if (!debitEligible) {
      setDebitWanted(false);
    }
  }, [debitEligible]);

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

  async function copyMpUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopyKey(url);
      window.setTimeout(() => setCopyKey(null), 2000);
    } catch {
      setCobroError('No se pudo copiar el link');
    }
  }

  function resetCobroStation() {
    setMpCheckoutUrl(null);
    setMpTransactionId(null);
    setMpApproved(false);
    setCart([]);
    setMemberId('');
    setMemberLabel('');
    setCashTransactionId(null);
    setCobroOk(null);
    setCobroError(null);
    setReceipt(null);
    setReceiptError(null);
    setDebitWanted(false);
    setDebitPayerEmail('');
    setApplyTrial(false);
    setMpClearConfirm(false);
    setCopyKey(null);
    setTransferReference('');
  }

  function requestClearMpCheckout() {
    if (mpApproved) {
      resetCobroStation();
      return;
    }
    setMpClearConfirm(true);
  }

  function showReceipt(transactionId: string | null) {
    if (!transactionId) {
      return;
    }
    if (receipt) {
      document.getElementById('receipt-panel')?.scrollIntoView({
        behavior: 'smooth',
      });
      return;
    }
    void getReceiptByTransaction(transactionId)
      .then(setReceipt)
      .catch(() => {
        setReceiptError('No se pudo cargar el comprobante');
      });
  }

  async function onCobro(e: FormEvent) {
    e.preventDefault();
    if (isPlatform ? !billingTenantId : !memberId) {
      setCobroError(isPlatform ? 'Elegí un gimnasio' : 'Elegí un afiliado');
      return;
    }
    if (cart.length === 0) {
      setCobroError('Agregá al menos un ítem al carrito');
      return;
    }
    if (isPlatform && cart.some((item) => item.kind !== 'PACK')) {
      setCobroError('La venta de plataforma solo admite packs');
      return;
    }
    if (isCounter && !trialApplied && !discountValid) {
      setCobroError('El descuento tiene que ser entre 0 y 99 %');
      return;
    }
    setCobroBusy(true);
    setCobroError(null);
    setCobroOk(null);
    setMpCheckoutUrl(null);
    setMpTransactionId(null);
    setMpApproved(false);
    setCashTransactionId(null);
    setCopyKey(null);
    setReceiptError(null);
    setReceipt(null);
    try {
      if (debitWanted && debitEligible && memberId && cart[0]?.kind === 'PACK') {
        const result = await enrollDebitMandate(memberId, {
          packId: cart[0].refId,
          chargeNow: true,
          payerEmail: debitPayerEmail.trim() || undefined,
          idempotencyKey: newIdempotencyKey('debit-enroll'),
        });
        const url = result.checkoutUrl;
        if (!url) {
          throw new Error('Suscripción creada sin URL (revisá cuenta MP)');
        }
        setMpCheckoutUrl(url);
        setMpTransactionId(null);
        setCobroOk(
          'Link de suscripción MP. El socio autoriza ahí; el contrato y el mandato entran por webhook.',
        );
        setCart([]);
        setDebitWanted(false);
        return;
      }
      if (cobroMedio === 'MP') {
        const result = isPlatform
          ? await startPlatformMpCartCheckout(billingTenantId, {
              items: cart.map((item) => ({
                kind: 'PACK' as const,
                id: item.refId,
              })),
              idempotencyKey: newIdempotencyKey('mp-cart'),
            })
          : await startStaffMpCartCheckout(memberId, {
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
        setMpTransactionId(result.transactionId);
        setCobroOk(
          `Link MP generado por ${formatMoney(result.amount)}. Cada pack/reserva del carrito se activa al aprobarse el pago.`,
        );
        setCart([]);
        return;
      }

      const counterMethod: CounterMethod =
        cobroMedio === 'TRANSFER' ? 'TRANSFER' : 'CASH';
      const charge: CounterChargeOptions = {
        method: counterMethod,
        ...(trialApplied ? {} : { discountPercent }),
        ...(counterMethod === 'TRANSFER' && transferReference.trim()
          ? { transferReference: transferReference.trim() }
          : {}),
      };
      const result = isPlatform
        ? await startPlatformCashCart(
            billingTenantId,
            cart.map((item) => ({ kind: 'PACK' as const, id: item.refId })),
            newIdempotencyKey('cash-cart'),
            trialApplied,
            charge,
          )
        : await startCashCart(
            memberId,
            cart.map((item) => ({
              kind: item.kind,
              id: item.refId,
            })),
            newIdempotencyKey('cash-cart'),
            charge,
          );
      const grantedTrial = Boolean(isPlatform && trialApplied);
      const labels = cart.map((item) => item.label);
      const medioLabel =
        counterMethod === 'TRANSFER' ? 'por transferencia' : 'en efectivo';
      setCart([]);
      setApplyTrial(false);
      setTransferReference('');
      setCounterDoneLabel(
        counterMethod === 'TRANSFER'
          ? 'Cobro por transferencia'
          : 'Cobro en efectivo',
      );
      setCobroOk(
        grantedTrial
          ? 'Prueba de 30 días activada (sin cobro). El gym ve el plan en Sistema → Plan / Uso.'
          : `${labels.length} cobro${labels.length === 1 ? '' : 's'} ${medioLabel} por ${formatMoney(result.amount)}: ${labels.join(' · ')}`,
      );
      setCashTransactionId(result.transactionId);
      if (result.receipt) {
        setReceipt(result.receipt);
      } else if (!grantedTrial) {
        try {
          setReceipt(await getReceiptByTransaction(result.transactionId));
        } catch {
          setReceiptError('No se pudo cargar el comprobante');
        }
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
      subtitle={
        isPlatform
          ? 'Venta de packs de plataforma a otros tenants.'
          : 'Cobros con carrito: packs y drop-in en efectivo, transferencia o Mercado Pago.'
      }
    >
      <ListToolbar hint="El cierre del día se ve en Cierre.">
        {isPlatform ? (
          <TenantPicker
            label="Gimnasio"
            value={billingTenantId}
            displayLabel={billingTenantLabel || undefined}
            onChange={(id) => {
              setBillingTenantId(id);
              setBillingTenantLabel('');
            }}
            onSelect={(t) => {
              setBillingTenantId(t.id);
              setBillingTenantLabel(t.name);
            }}
            placeholder="Buscar gimnasio por nombre o slug…"
            autoFocus
          />
        ) : (
          <MemberPicker
            label="Afiliado"
            value={memberId}
            displayLabel={memberLabel || undefined}
            onChange={(id) => {
              setMemberId(id);
              setMemberLabel('');
            }}
            placeholder="Buscar por nombre o email…"
            autoFocus
          />
        )}
      </ListToolbar>

      <div className="cash-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={vista === 'cobro'}
          className={vista === 'cobro' ? 'active' : undefined}
          onClick={() => setVista('cobro')}
        >
          Cobro
        </button>
        {isPlatform ? null : (
          <button
            type="button"
            role="tab"
            aria-selected={vista === 'debitos'}
            className={vista === 'debitos' ? 'active' : undefined}
            onClick={() => setVista('debitos')}
          >
            Débitos
          </button>
        )}
      </div>

      {receiptError ? <p className="error">{receiptError}</p> : null}

      {receipt ? (
        <div id="receipt-panel">
          <ReceiptPanel
            receipt={receipt}
            title="Comprobante emitido"
            onClose={() => setReceipt(null)}
            showMpStatus
          />
        </div>
      ) : null}

      {vista === 'debitos' && !isPlatform ? (
        <CajaDebitPanel memberId={memberId} />
      ) : (
      <div className="cash-layout">
        <Panel
          title="Catálogo"
          description="Agregá ítems al carrito con el botón +."
        >
          <div className="cash-tabs" role="tablist">
            {isPlatform ? null : (
              <button
                type="button"
                role="tab"
                aria-selected={catalogTab === 'SERVICIOS'}
                className={catalogTab === 'SERVICIOS' ? 'active' : undefined}
                onClick={() => setCatalogTab('SERVICIOS')}
              >
                Servicios
              </button>
            )}
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
            <CartLineList
              items={cart}
              total={chargeTotal}
              onRemove={removeItem}
            />
          )}

          <form className="admin-form" onSubmit={(e) => void onCobro(e)}>
            <fieldset className="mode-toggle">
              <legend>Medio</legend>
              <label>
                <input
                  type="radio"
                  name="medio"
                  checked={cobroMedio === 'CASH'}
                  onChange={() => chooseMedio('CASH')}
                />
                Efectivo (suma al cierre)
              </label>
              <label>
                <input
                  type="radio"
                  name="medio"
                  checked={cobroMedio === 'TRANSFER'}
                  onChange={() => chooseMedio('TRANSFER')}
                />
                Transferencia (ya acreditada)
              </label>
              <label>
                <input
                  type="radio"
                  name="medio"
                  checked={cobroMedio === 'MP'}
                  onChange={() => chooseMedio('MP')}
                />
                Mercado Pago (link único)
              </label>
            </fieldset>

            {isCounter && !trialApplied ? (
              <label>
                Descuento (%)
                <input
                  type="number"
                  min={0}
                  max={99}
                  step={0.01}
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                />
              </label>
            ) : null}
            {discountActive && cart.length > 0 ? (
              <p className="muted small">
                Lista {formatMoney(total)} − {discountInput} % = {formatMoney(chargeTotal)}.
                El default sale de Config; 0 = precio de lista.
              </p>
            ) : null}

            {cobroMedio === 'TRANSFER' ? (
              <>
                <label>
                  Referencia (opcional)
                  <input
                    value={transferReference}
                    onChange={(e) => setTransferReference(e.target.value)}
                    maxLength={120}
                    placeholder="Nº de operación o quién transfirió"
                  />
                </label>
                <p className="muted small">
                  Registrá solo transferencias que ya viste acreditadas en la
                  cuenta del gym. No suma al efectivo del cierre: va en
                  «digital».
                </p>
              </>
            ) : null}

            {isPlatform && billingTenantId && cobroMedio === 'CASH' ? (
              <fieldset className="mode-toggle">
                <legend>Prueba Faciliter</legend>
                <label>
                  <input
                    type="checkbox"
                    checked={applyTrial}
                    disabled={!trialCanApply}
                    onChange={(e) => setApplyTrial(e.target.checked)}
                  />
                  30 días de prueba (no cobra ahora)
                </label>
                {!trialEligible && trialHint ? (
                  <p className="muted small">{trialHint}</p>
                ) : null}
                {trialEligible && !trialCanApply ? (
                  <p className="muted small">
                    La prueba es un solo pack, en efectivo, y el pack tiene que
                    ofrecerla.
                  </p>
                ) : null}
              </fieldset>
            ) : null}

            {cobroMedio === 'MP' ? (
              <p className="muted small">
                Se genera un solo link con el total del carrito (como Mercado
                Libre: 1 carrito → 1 pago). Cada pack/reserva se activa al
                aprobarse el pago (webhook). Requiere cuenta MP en Config.
              </p>
            ) : null}

            {debitEligible ? (
              <fieldset className="mode-toggle">
                <legend>Débito automático</legend>
                <label>
                  <input
                    type="checkbox"
                    checked={debitWanted}
                    onChange={(e) => setDebitWanted(e.target.checked)}
                  />
                  Autorizar cobro mensual de este pack al precio de catálogo
                </label>
              </fieldset>
            ) : null}

            {debitWanted && debitEligible ? (
              <>
                <label>
                  Mail de la cuenta Mercado Pago del socio
                  <input
                    type="email"
                    value={debitPayerEmail}
                    onChange={(e) => setDebitPayerEmail(e.target.value)}
                    placeholder="Vacío: el mail del afiliado"
                  />
                </label>
                <p className="muted small">
                  Se genera un link de suscripción Mercado Pago (no se guarda
                  la tarjeta en Faciliter). Solo lo puede autorizar la cuenta
                  de MP con ese mail. El primer cobro es al autorizar.
                </p>
              </>
            ) : null}

            {cobroError ? <p className="error">{cobroError}</p> : null}
            {cobroOk ? <p className="ok-msg">{cobroOk}</p> : null}

            {cashTransactionId ? (
              <div className="cart-line">
                <div>
                  <p className="cart-name">
                    {counterDoneLabel || 'Cobro en efectivo'}
                  </p>
                  <p className="muted small">Comprobante listo</p>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => showReceipt(cashTransactionId)}
                  >
                    <IconReceipt />
                    Ver comprobante
                  </button>
                </div>
              </div>
            ) : null}

            {mpCheckoutUrl ? (
              <MpCheckoutShare
                url={mpCheckoutUrl}
                approved={mpApproved}
                copyDone={copyKey === mpCheckoutUrl}
                onCopy={() => void copyMpUrl(mpCheckoutUrl)}
                onOpen={() =>
                  window.open(mpCheckoutUrl, '_blank', 'noopener,noreferrer')
                }
                onClear={requestClearMpCheckout}
                onReceipt={() => showReceipt(mpTransactionId)}
              />
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
                disabled={
                  cobroBusy ||
                  cart.length === 0 ||
                  (isPlatform ? !billingTenantId : !memberId)
                }
                title={
                  isPlatform
                    ? !billingTenantId
                      ? 'Elegí el gimnasio de la lista de búsqueda'
                      : cart.length === 0
                        ? 'Agregá al menos un ítem al carrito'
                        : undefined
                    : !memberId
                      ? 'Elegí el afiliado de la lista de búsqueda'
                      : cart.length === 0
                        ? 'Agregá al menos un ítem al carrito'
                        : undefined
                }
              >
                {cobroBusy
                  ? debitWanted
                    ? 'Generando link de débito…'
                    : cobroMedio === 'MP'
                      ? 'Generando link…'
                      : 'Cobrando…'
                  : debitWanted
                    ? 'Generar link de débito'
                    : cobroMedio === 'MP'
                      ? 'Generar link MP'
                      : `${cobroMedio === 'TRANSFER' ? 'Registrar transferencia' : 'Cobrar en efectivo'}${cart.length > 0 ? ` ${formatMoney(chargeTotal)}` : ''}`}
              </button>
            </div>
          </form>
        </Panel>
      </div>
      )}
      <ConfirmDialog
        open={mpClearConfirm}
        title="Cancelar y limpiar"
        description="Se saca el link de esta pantalla, el carrito y el afiliado. Si el socio ya pagó en Mercado Pago, el cobro igual puede entrar por el webhook."
        confirmLabel="Limpiar"
        cancelLabel="Seguir esperando"
        tone="danger"
        onConfirm={resetCobroStation}
        onCancel={() => setMpClearConfirm(false)}
      />
    </AdminShell>
  );
}
