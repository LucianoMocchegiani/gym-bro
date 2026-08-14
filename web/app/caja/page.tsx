'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { DataTable, ListToolbar } from '@/components/AdminList';
import { AdminShell } from '@/components/AdminShell';
import { AdminGrid, Panel } from '@/components/AdminUi';
import { ReceiptPanel } from '@/components/ReceiptPanel';
import { RequireStaff } from '@/components/RequireStaff';
import { StatusPill } from '@/components/StatusPill';
import {
  getCashDay,
  reconcileCashDay,
  todayBusinessDate,
} from '@/lib/api/cash-register';
import type { CashDayDetail } from '@/lib/api/cash-register';
import { ApiClientError, newIdempotencyKey } from '@/lib/api/client';
import { createCashContract } from '@/lib/api/contracts';
import { listMembers } from '@/lib/api/members';
import type { MemberDetail } from '@/lib/api/members';
import {
  pickMpCheckoutUrl,
  startStaffMpDropInCheckout,
  startStaffMpPackCheckout,
} from '@/lib/api/mercadopago';
import { listActivePacks } from '@/lib/api/packs';
import type { PackSummary } from '@/lib/api/packs';
import { createCashDropIn } from '@/lib/api/reservations';
import { getReceiptByPayment } from '@/lib/api/receipts';
import type { ReceiptDetail } from '@/lib/api/receipts';
import { listSessions } from '@/lib/api/sessions';
import type { SessionSummary } from '@/lib/api/sessions';
import { formatCashConcept, formatMoney } from '@/lib/cash-labels';

type CobroKind = 'PACK' | 'DROP_IN';
type CobroMedio = 'CASH' | 'MP';

/**
 * Caja del día + cobro CASH/MP + arqueo + comprobantes (CU-PAG / RN-PAG-009).
 */
export default function CajaPage() {
  return (
    <RequireStaff>
      <CajaInner />
    </RequireStaff>
  );
}

function CajaInner() {
  const [date, setDate] = useState(todayBusinessDate);
  const [day, setDay] = useState<CashDayDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState<MemberDetail[]>([]);
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [cobroKind, setCobroKind] = useState<CobroKind>('PACK');
  const [cobroMedio, setCobroMedio] = useState<CobroMedio>('CASH');
  const [memberFilter, setMemberFilter] = useState('');
  const [memberId, setMemberId] = useState('');
  const [packId, setPackId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [cobroBusy, setCobroBusy] = useState(false);
  const [cobroError, setCobroError] = useState<string | null>(null);
  const [cobroOk, setCobroOk] = useState<string | null>(null);
  const [mpCheckoutUrl, setMpCheckoutUrl] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState(false);

  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [receiptBusyId, setReceiptBusyId] = useState<string | null>(null);

  const [declaredAmount, setDeclaredAmount] = useState('');
  const [reconcileNote, setReconcileNote] = useState('');
  const [reconcileBusy, setReconcileBusy] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await getCashDay(date);
        if (cancelled) {
          return;
        }
        setDay(data);
        setLoadError(null);
        if (!data.reconciliation) {
          setDeclaredAmount(String(data.totals.net));
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar la caja del día',
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
  }, [date]);

  async function reloadDay(targetDate = date) {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getCashDay(targetDate);
      setDay(data);
      if (!data.reconciliation) {
        setDeclaredAmount(String(data.totals.net));
      }
    } catch (err) {
      setLoadError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cargar la caja del día',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const from = new Date();
        const to = new Date();
        to.setDate(to.getDate() + 14);
        const [membersResult, packsResult, sessionsResult] = await Promise.all([
          listMembers({
            status: 'ACTIVE',
            pageSize: 100,
            order: 'asc',
            orderBy: 'name',
          }),
          listActivePacks(),
          listSessions({
            status: 'PUBLISHED',
            from: from.toISOString(),
            to: to.toISOString(),
            pageSize: 100,
          }),
        ]);
        if (cancelled) {
          return;
        }
        setMembers(membersResult.items);
        setPacks(packsResult.items);
        setSessions(sessionsResult.items);
        if (membersResult.items.length > 0) {
          setMemberId((prev) => prev || membersResult.items[0].id);
        }
        if (packsResult.items.length > 0) {
          setPackId((prev) => prev || packsResult.items[0].id);
        }
        if (sessionsResult.items.length > 0) {
          setSessionId((prev) => prev || sessionsResult.items[0].id);
        }
        setCatalogError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setCatalogError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar catálogo de cobro',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredMembers = useMemo(() => {
    const q = memberFilter.trim().toLowerCase();
    if (!q) {
      return members;
    }
    return members.filter(
      (m) =>
        (m.name?.toLowerCase().includes(q) ?? false) ||
        m.email.toLowerCase().includes(q),
    );
  }, [members, memberFilter]);

  const selectedPack = packs.find((p) => p.id === packId);

  async function openReceiptForPayment(paymentId: string) {
    setReceiptBusyId(paymentId);
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
    } finally {
      setReceiptBusyId(null);
    }
  }

  async function copyMpUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopyOk(true);
      window.setTimeout(() => setCopyOk(false), 2000);
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
    setCobroBusy(true);
    setCobroError(null);
    setCobroOk(null);
    setMpCheckoutUrl(null);
    setCopyOk(false);
    setReceiptError(null);
    try {
      if (cobroMedio === 'MP') {
        if (cobroKind === 'PACK') {
          if (!packId) {
            setCobroError('Elegí un pack');
            setCobroBusy(false);
            return;
          }
          const result = await startStaffMpPackCheckout(memberId, {
            packId,
            idempotencyKey: newIdempotencyKey('mp-pack'),
          });
          const url = pickMpCheckoutUrl(result);
          if (!url) {
            setCobroError('Checkout creado sin URL (revisá cuenta MP / modo)');
            return;
          }
          setMpCheckoutUrl(url);
          setCobroOk(
            `Link MP listo (pago ${result.status}). El pack se activa al aprobarse el pago.`,
          );
          window.open(url, '_blank', 'noopener,noreferrer');
        } else {
          if (!sessionId) {
            setCobroError('Elegí una sesión');
            setCobroBusy(false);
            return;
          }
          const result = await startStaffMpDropInCheckout(memberId, {
            sessionId,
            idempotencyKey: newIdempotencyKey('mp-dropin'),
          });
          const url = pickMpCheckoutUrl(result);
          if (!url) {
            setCobroError('Checkout creado sin URL (revisá cuenta MP / modo)');
            return;
          }
          setMpCheckoutUrl(url);
          setCobroOk(
            `Link MP listo (pago ${result.status}). La reserva se confirma al aprobarse el pago.`,
          );
          window.open(url, '_blank', 'noopener,noreferrer');
        }
        return;
      }

      let paymentId: string | null = null;
      if (cobroKind === 'PACK') {
        if (!packId) {
          setCobroError('Elegí un pack');
          setCobroBusy(false);
          return;
        }
        const contract = await createCashContract(
          memberId,
          packId,
          newIdempotencyKey('cash-pack'),
        );
        paymentId = contract.payment.id;
        setCobroOk('Pack cobrado en efectivo.');
      } else {
        if (!sessionId) {
          setCobroError('Elegí una sesión');
          setCobroBusy(false);
          return;
        }
        const reservation = await createCashDropIn(
          memberId,
          sessionId,
          newIdempotencyKey('cash-dropin'),
        );
        paymentId = reservation.paymentId;
        setCobroOk('Drop-in cobrado en efectivo.');
      }
      await reloadDay(date);
      if (paymentId) {
        await openReceiptForPayment(paymentId);
      }
    } catch (err) {
      setCobroError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo registrar el cobro',
      );
    } finally {
      setCobroBusy(false);
    }
  }

  async function onReconcile(e: FormEvent) {
    e.preventDefault();
    const declared = Number(declaredAmount);
    if (!Number.isInteger(declared) || declared < 0) {
      setReconcileError('Declará un monto entero ≥ 0');
      return;
    }
    const ok = window.confirm(
      `¿Confirmar arqueo con ${formatMoney(declared)}? Solo se puede una vez por día.`,
    );
    if (!ok) {
      return;
    }
    setReconcileBusy(true);
    setReconcileError(null);
    try {
      const data = await reconcileCashDay({
        date,
        declaredAmount: declared,
        note: reconcileNote.trim() || undefined,
      });
      setDay(data);
    } catch (err) {
      setReconcileError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cerrar el arqueo',
      );
    } finally {
      setReconcileBusy(false);
    }
  }

  return (
    <AdminShell title="Caja">
      <ListToolbar hint="Movimientos CASH del día. MP no suma al arqueo de efectivo.">
        <label className="toolbar-field">
          Día (timezone BA)
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </ListToolbar>

      {receiptError ? <p className="error">{receiptError}</p> : null}

      {receipt ? (
        <ReceiptPanel
          receipt={receipt}
          title="Comprobante emitido"
          onClose={() => setReceipt(null)}
        />
      ) : null}

      {day ? (
        <>
          <div className="stat-row cash-stats">
            <div className="admin-panel stat-card">
              <p className="muted small">Ingresos</p>
              <p className="stat-value">{formatMoney(day.totals.income)}</p>
            </div>
            <div className="admin-panel stat-card">
              <p className="muted small">Egresos</p>
              <p className="stat-value">{formatMoney(day.totals.outcome)}</p>
            </div>
            <div className="admin-panel stat-card">
              <p className="muted small">Neto esperado</p>
              <p className="stat-value">{formatMoney(day.totals.net)}</p>
            </div>
            <div className="admin-panel stat-card">
              <p className="muted small">Movimientos</p>
              <p className="stat-value">{day.totals.movementCount}</p>
            </div>
          </div>

          <AdminGrid className="cash-dashboard">
            <Panel
              title="Cobro en caja"
              description="Pack o drop-in en efectivo o con link de Mercado Pago."
            >
              {catalogError ? <p className="error">{catalogError}</p> : null}
              <form className="admin-form" onSubmit={(e) => void onCobro(e)}>
                <fieldset className="mode-toggle">
                  <legend>Concepto</legend>
                  <label>
                    <input
                      type="radio"
                      name="cobro"
                      checked={cobroKind === 'PACK'}
                      onChange={() => setCobroKind('PACK')}
                    />
                    Pack
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="cobro"
                      checked={cobroKind === 'DROP_IN'}
                      onChange={() => setCobroKind('DROP_IN')}
                    />
                    Drop-in
                  </label>
                </fieldset>

                <fieldset className="mode-toggle">
                  <legend>Medio</legend>
                  <label>
                    <input
                      type="radio"
                      name="medio"
                      checked={cobroMedio === 'CASH'}
                      onChange={() => setCobroMedio('CASH')}
                    />
                    Efectivo
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="medio"
                      checked={cobroMedio === 'MP'}
                      onChange={() => setCobroMedio('MP')}
                    />
                    Mercado Pago
                  </label>
                </fieldset>

                <label>
                  Buscar afiliado
                  <input
                    value={memberFilter}
                    onChange={(e) => setMemberFilter(e.target.value)}
                    placeholder="Nombre o email"
                    autoComplete="off"
                  />
                </label>
                <label>
                  Afiliado
                  <select
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    required
                  >
                    {filteredMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {(m.name ?? 'Sin nombre') + ` — ${m.email}`}
                      </option>
                    ))}
                  </select>
                </label>

                {cobroKind === 'PACK' ? (
                  <label>
                    Pack
                    <select
                      value={packId}
                      onChange={(e) => setPackId(e.target.value)}
                      required
                    >
                      {packs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {formatMoney(p.price)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label>
                    Sesión
                    <select
                      value={sessionId}
                      onChange={(e) => setSessionId(e.target.value)}
                      required
                    >
                      {sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.serviceName} —{' '}
                          {new Date(s.startsAt).toLocaleString('es-AR')} (
                          {s.bookedCount}/{s.capacity})
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {cobroKind === 'PACK' && selectedPack ? (
                  <p className="muted small">
                    Monto: {formatMoney(selectedPack.price)} · Medio:{' '}
                    {cobroMedio === 'CASH' ? 'Efectivo' : 'Mercado Pago'}
                  </p>
                ) : (
                  <p className="muted small">
                    Medio:{' '}
                    {cobroMedio === 'CASH' ? 'Efectivo' : 'Mercado Pago'}
                  </p>
                )}

                {cobroMedio === 'MP' ? (
                  <p className="muted small">
                    Requiere cuenta MP en Config. El pack/reserva se activa al
                    aprobarse el pago (webhook). Drop-in no reserva cupo hasta
                    entonces.
                  </p>
                ) : null}

                {cobroError ? <p className="error">{cobroError}</p> : null}
                {cobroOk ? <p className="ok-msg">{cobroOk}</p> : null}

                {mpCheckoutUrl ? (
                  <div className="admin-stack">
                    <label>
                      Link de pago
                      <input readOnly value={mpCheckoutUrl} />
                    </label>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() =>
                          window.open(
                            mpCheckoutUrl,
                            '_blank',
                            'noopener,noreferrer',
                          )
                        }
                      >
                        Abrir link
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => void copyMpUrl(mpCheckoutUrl)}
                      >
                        {copyOk ? 'Copiado' : 'Copiar link'}
                      </button>
                    </div>
                  </div>
                ) : null}

                <button type="submit" className="primary" disabled={cobroBusy}>
                  {cobroMedio === 'MP'
                    ? cobroBusy
                      ? 'Generando link…'
                      : 'Generar link MP'
                    : cobroBusy
                      ? 'Cobrando…'
                      : 'Cobrar'}
                </button>
              </form>
            </Panel>

            <Panel title="Arqueo" description="Un cierre por día de negocio.">
              {day.reconciliation ? (
                <div className="admin-stack">
                  <p className="ok-msg">Arqueo cerrado</p>
                  <ul className="plain-list">
                    <li>
                      Esperado:{' '}
                      {formatMoney(day.reconciliation.expectedAmount)}
                    </li>
                    <li>
                      Declarado:{' '}
                      {formatMoney(day.reconciliation.declaredAmount)}
                    </li>
                    <li>
                      Diferencia:{' '}
                      {formatMoney(day.reconciliation.difference)}
                    </li>
                    {day.reconciliation.reconciledByStaffName ? (
                      <li>
                        Por: {day.reconciliation.reconciledByStaffName}
                      </li>
                    ) : null}
                    {day.reconciliation.note ? (
                      <li>Nota: {day.reconciliation.note}</li>
                    ) : null}
                  </ul>
                </div>
              ) : (
                <form
                  className="admin-form"
                  onSubmit={(e) => void onReconcile(e)}
                >
                  <label>
                    Efectivo declarado
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={declaredAmount}
                      onChange={(e) => setDeclaredAmount(e.target.value)}
                      required
                    />
                  </label>
                  <p className="muted small">
                    Esperado neto: {formatMoney(day.totals.net)}
                    {declaredAmount !== '' &&
                    Number.isInteger(Number(declaredAmount))
                      ? ` · Diff: ${formatMoney(Number(declaredAmount) - day.totals.net)}`
                      : ''}
                  </p>
                  <label>
                    Nota (opcional)
                    <textarea
                      value={reconcileNote}
                      onChange={(e) => setReconcileNote(e.target.value)}
                      rows={2}
                      maxLength={500}
                    />
                  </label>
                  {reconcileError ? (
                    <p className="error">{reconcileError}</p>
                  ) : null}
                  <button
                    type="submit"
                    className="primary"
                    disabled={reconcileBusy}
                  >
                    {reconcileBusy ? 'Cerrando…' : 'Cerrar arqueo'}
                  </button>
                </form>
              )}
            </Panel>
          </AdminGrid>
        </>
      ) : null}

      <DataTable
        title="Movimientos"
        description={
          day
            ? `${day.movements.length} del ${day.businessDate}`
            : undefined
        }
        loading={loading}
        error={loadError}
        isEmpty={!day || day.movements.length === 0}
        emptyText="Sin movimientos CASH en este día."
        paginate={false}
        header={
          <>
            <th>Hora</th>
            <th>Afiliado</th>
            <th>Concepto</th>
            <th>Tipo</th>
            <th>Monto</th>
            <th>Staff</th>
            <th />
          </>
        }
      >
        {(day?.movements ?? []).map((m) => (
          <tr key={m.id}>
            <td>
              {new Date(m.createdAt).toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </td>
            <td>{m.memberName ?? m.memberId.slice(0, 8)}</td>
            <td>{formatCashConcept(m.concept)}</td>
            <td>
              <StatusPill tone={m.kind === 'INCOME' ? 'ok' : 'danger'}>
                {m.kind === 'INCOME' ? 'Ingreso' : 'Egreso'}
              </StatusPill>
            </td>
            <td>{formatMoney(m.amount)}</td>
            <td>{m.recordedByStaffName ?? '—'}</td>
            <td className="row-actions">
              {m.kind === 'INCOME' &&
              (m.concept === 'PACK_CONTRACT' || m.concept === 'DROP_IN') ? (
                <button
                  type="button"
                  className="btn ghost"
                  disabled={receiptBusyId === m.paymentId}
                  onClick={() => void openReceiptForPayment(m.paymentId)}
                >
                  {receiptBusyId === m.paymentId ? '…' : 'Comprobante'}
                </button>
              ) : null}
            </td>
          </tr>
        ))}
      </DataTable>
    </AdminShell>
  );
}
