'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { AdminGrid, Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
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
import { listActivePacks } from '@/lib/api/packs';
import type { PackSummary } from '@/lib/api/packs';
import { createCashDropIn } from '@/lib/api/reservations';
import { listSessions } from '@/lib/api/sessions';
import type { SessionSummary } from '@/lib/api/sessions';
import { formatCashConcept, formatMoney } from '@/lib/cash-labels';

type CobroKind = 'PACK' | 'DROP_IN';

/**
 * Caja del día + cobro efectivo + arqueo (CU-PAG-002 / CU-PAG-003).
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
  const [memberFilter, setMemberFilter] = useState('');
  const [memberId, setMemberId] = useState('');
  const [packId, setPackId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [cobroBusy, setCobroBusy] = useState(false);
  const [cobroError, setCobroError] = useState<string | null>(null);
  const [cobroOk, setCobroOk] = useState<string | null>(null);

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
        const [memberRows, packRows, sessionRows] = await Promise.all([
          listMembers('ACTIVE'),
          listActivePacks(),
          listSessions({
            status: 'PUBLISHED',
            from: from.toISOString(),
            to: to.toISOString(),
          }),
        ]);
        if (cancelled) {
          return;
        }
        setMembers(memberRows);
        setPacks(packRows);
        setSessions(sessionRows);
        if (memberRows[0]) {
          setMemberId(memberRows[0].id);
        }
        if (packRows[0]) {
          setPackId(packRows[0].id);
        }
        if (sessionRows[0]) {
          setSessionId(sessionRows[0].id);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        setCatalogError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar catálogo para cobros',
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
        (m.name ?? '').toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q),
    );
  }, [members, memberFilter]);

  const selectedPack = packs.find((p) => p.id === packId);

  async function onCobro(e: FormEvent) {
    e.preventDefault();
    if (!memberId) {
      setCobroError('Elegí un afiliado');
      return;
    }
    setCobroBusy(true);
    setCobroError(null);
    setCobroOk(null);
    try {
      if (cobroKind === 'PACK') {
        if (!packId) {
          setCobroError('Elegí un pack');
          return;
        }
        await createCashContract(
          memberId,
          packId,
          newIdempotencyKey('cash-pack'),
        );
        setCobroOk('Pack cobrado en efectivo.');
      } else {
        if (!sessionId) {
          setCobroError('Elegí una sesión');
          return;
        }
        await createCashDropIn(
          memberId,
          sessionId,
          newIdempotencyKey('cash-dropin'),
        );
        setCobroOk('Drop-in cobrado en efectivo.');
      }
      await reloadDay(date);
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
      <Panel className="toolbar">
        <label className="toolbar-field">
          Día (timezone BA)
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <p className="muted small toolbar-hint">
          Movimientos CASH del día. STUB no entra a caja.
        </p>
      </Panel>

      {loading ? <p className="muted">Cargando caja…</p> : null}
      {loadError ? <p className="error">{loadError}</p> : null}

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
              description="Pack o drop-in con método efectivo."
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
                    Monto: {formatMoney(selectedPack.price)} · Medio: Efectivo
                  </p>
                ) : null}

                {cobroError ? <p className="error">{cobroError}</p> : null}
                {cobroOk ? <p className="ok-msg">{cobroOk}</p> : null}

                <button type="submit" className="primary" disabled={cobroBusy}>
                  {cobroBusy ? 'Cobrando…' : 'Cobrar'}
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
                    {declaredAmount !== '' && Number.isInteger(Number(declaredAmount))
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

          <Panel
            title="Movimientos"
            description={`${day.movements.length} del ${day.businessDate}`}
            className="table-wrap"
          >
            {day.movements.length === 0 ? (
              <p className="muted">Sin movimientos CASH en este día.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Afiliado</th>
                    <th>Concepto</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Staff</th>
                  </tr>
                </thead>
                <tbody>
                  {day.movements.map((m) => (
                    <tr key={m.id}>
                      <td>
                        {new Date(m.createdAt).toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>{m.memberName ?? m.memberId.slice(0, 8)}</td>
                      <td>{formatCashConcept(m.concept)}</td>
                      <td>{m.kind === 'INCOME' ? 'Ingreso' : 'Egreso'}</td>
                      <td>{formatMoney(m.amount)}</td>
                      <td>{m.recordedByStaffName ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </>
      ) : null}
    </AdminShell>
  );
}
