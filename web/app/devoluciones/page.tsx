'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { AdminGrid, Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { getMember } from '@/lib/api/members';
import {
  executeRefund,
  listRefundRequests,
} from '@/lib/api/refunds';
import type {
  RefundExecutionDetail,
  RefundMotiveCode,
  RefundRequestDetail,
  RefundRequestStatus,
} from '@/lib/api/refunds';
import { formatMoney } from '@/lib/cash-labels';

type StatusFilter = RefundRequestStatus | 'ALL';

type MemberLabelMap = Record<string, string>;

/**
 * Formatea instante en timezone BA.
 */
function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(iso));
}

/**
 * Etiqueta corta de status de solicitud.
 */
function statusLabel(status: RefundRequestStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Pendiente';
    case 'EXECUTED':
      return 'Ejecutada';
    case 'REJECTED':
      return 'Rechazada';
    default:
      return status;
  }
}

/**
 * Cola de solicitudes + ejecución de devoluciones (CU-PAG-005 / CU-PAG-007).
 *
 * @remarks Requiere permiso API `payments.refund`. No hay rechazo staff en API:
 * solo ejecutar o dejar PENDING.
 */
export default function DevolucionesPage() {
  return (
    <RequireStaff>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <DevolucionesInner />
      </Suspense>
    </RequireStaff>
  );
}

function DevolucionesInner() {
  const searchParams = useSearchParams();
  const prefillPaymentId = searchParams.get('paymentId')?.trim() ?? '';

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');
  const [items, setItems] = useState<RefundRequestDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [memberLabels, setMemberLabels] = useState<MemberLabelMap>({});

  const [selected, setSelected] = useState<RefundRequestDetail | null>(null);
  /** Override manual; si null, usa `?paymentId=` de la URL. */
  const [directPaymentDraft, setDirectPaymentDraft] = useState<string | null>(
    null,
  );
  const directPaymentId = directPaymentDraft ?? prefillPaymentId;
  const [reason, setReason] = useState(
    prefillPaymentId ? 'Doble cobro' : '',
  );
  const [motiveCode, setMotiveCode] = useState<RefundMotiveCode>(
    prefillPaymentId ? 'doble_cobro' : 'solicitud',
  );
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<RefundExecutionDetail | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listRefundRequests({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        pageSize: 50,
        order: 'desc',
        orderBy: 'createdAt',
      });
      setItems(result.items);
      setTotal(result.total);
      setLoadError(null);

      const ids = [...new Set(result.items.map((r) => r.memberId))];
      if (ids.length > 0) {
        const settled = await Promise.allSettled(
          ids.map(async (id) => {
            const m = await getMember(id);
            return {
              id,
              label: m.name?.trim() || m.email || id.slice(0, 8),
            };
          }),
        );
        const next: MemberLabelMap = {};
        for (const s of settled) {
          if (s.status === 'fulfilled') {
            next[s.value.id] = s.value.label;
          }
        }
        setMemberLabels(next);
      } else {
        setMemberLabels({});
      }
    } catch (err) {
      setItems([]);
      setTotal(0);
      setLoadError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudieron cargar las solicitudes',
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    // Fetch remoto al cambiar filtro; mismo patrón que caja/reportes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga API
    void load();
  }, [load]);

  const paymentIdToExecute = selected?.paymentId ?? directPaymentId.trim();

  const canSubmit = useMemo(() => {
    return (
      Boolean(paymentIdToExecute) &&
      reason.trim().length >= 3 &&
      confirmText.trim().toUpperCase() === 'DEVOLVER' &&
      !busy
    );
  }, [paymentIdToExecute, reason, confirmText, busy]);

  function selectRequest(row: RefundRequestDetail) {
    setSelected(row);
    setDirectPaymentDraft('');
    setActionError(null);
    setActionOk(null);
    setLastResult(null);
    setConfirmText('');
    if (row.status === 'PENDING') {
      setMotiveCode('solicitud');
      setReason(row.reason?.trim() || 'Solicitud del afiliado');
    }
  }

  function clearSelection() {
    setSelected(null);
    setDirectPaymentDraft(null);
    setConfirmText('');
    setActionError(null);
  }

  async function onExecute(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !paymentIdToExecute) {
      return;
    }
    setBusy(true);
    setActionError(null);
    setActionOk(null);
    setLastResult(null);
    try {
      const result = await executeRefund(paymentIdToExecute, {
        reason: reason.trim(),
        motiveCode,
        ...(selected ? { refundRequestId: selected.id } : {}),
      });
      setLastResult(result);
      const mpNote = result.mpRefundManualPending
        ? ' (MP manual pendiente)'
        : '';
      setActionOk(
        `Devolución OK: ${formatMoney(result.amount)} · ${result.method}${mpNote}`,
      );
      setConfirmText('');
      setSelected(null);
      setDirectPaymentDraft(null);
      await load();
    } catch (err) {
      setActionError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo ejecutar la devolución',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Devoluciones">
      <Panel className="toolbar">
        <label className="toolbar-field">
          Estado
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as StatusFilter)
            }
          >
            <option value="PENDING">Pendientes</option>
            <option value="EXECUTED">Ejecutadas</option>
            <option value="REJECTED">Rechazadas (política)</option>
            <option value="ALL">Todas</option>
          </select>
        </label>
        <p className="muted small toolbar-hint">
          Requiere permiso <code>payments.refund</code>. Total: {total}
        </p>
      </Panel>

      {loading ? <p className="muted">Cargando solicitudes…</p> : null}
      {loadError ? <p className="error">{loadError}</p> : null}

      <AdminGrid>
        <Panel title="Solicitudes">
          {!loading && !loadError && items.length === 0 ? (
            <p className="muted">No hay solicitudes en este filtro.</p>
          ) : null}
          {items.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Afiliado</th>
                    <th>Estado</th>
                    <th>Motivo</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td>{formatWhen(row.createdAt)}</td>
                      <td>
                        <Link href={`/afiliados/${row.memberId}`}>
                          {memberLabels[row.memberId] ??
                            row.memberId.slice(0, 8)}
                        </Link>
                      </td>
                      <td>
                        <span className="badge">{statusLabel(row.status)}</span>
                      </td>
                      <td className="muted small">
                        {row.reason ?? row.rejectionReason ?? '—'}
                      </td>
                      <td>
                        {row.status === 'PENDING' ? (
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => selectRequest(row)}
                          >
                            Ejecutar
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="linkish"
                            onClick={() => selectRequest(row)}
                          >
                            Ver
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Panel>

        <Panel
          title={
            selected
              ? 'Ejecutar desde solicitud'
              : 'Devolución directa (pago)'
          }
          description={
            selected
              ? `Solicitud ${selected.id.slice(0, 8)}… · pago ${selected.paymentId.slice(0, 8)}…`
              : 'Para doble cobro u otras devoluciones sin solicitud PENDING.'
          }
        >
          {selected && selected.status !== 'PENDING' ? (
            <div className="admin-stack">
              <p>
                Estado: <strong>{statusLabel(selected.status)}</strong>
              </p>
              {selected.rejectionReason ? (
                <p className="muted">
                  Rechazo política: {selected.rejectionReason}
                </p>
              ) : null}
              <p className="muted small">
                Solo las pendientes se pueden ejecutar desde acá. Para otro pago
                usá devolución directa.
              </p>
              <button type="button" className="btn ghost" onClick={clearSelection}>
                Limpiar
              </button>
            </div>
          ) : (
            <form className="admin-form" onSubmit={(e) => void onExecute(e)}>
              {!selected ? (
                <label>
                  ID del pago
                  <input
                    value={directPaymentId}
                    onChange={(e) => {
                      setDirectPaymentDraft(e.target.value);
                      setSelected(null);
                    }}
                    placeholder="uuid del payment"
                    required
                    autoComplete="off"
                  />
                </label>
              ) : (
                <p className="muted small">
                  Afiliado:{' '}
                  <Link href={`/afiliados/${selected.memberId}`}>
                    {memberLabels[selected.memberId] ?? selected.memberId}
                  </Link>
                  {' · '}
                  <button
                    type="button"
                    className="linkish"
                    onClick={clearSelection}
                  >
                    Cambiar a directa
                  </button>
                </p>
              )}

              <label>
                Motivo tipificado
                <select
                  value={motiveCode}
                  onChange={(e) =>
                    setMotiveCode(e.target.value as RefundMotiveCode)
                  }
                >
                  <option value="solicitud">Solicitud afiliado</option>
                  <option value="doble_cobro">Doble cobro</option>
                  <option value="otro">Otro</option>
                </select>
              </label>

              <label>
                Motivo (texto, mín. 3)
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  required
                  minLength={3}
                  maxLength={500}
                />
              </label>

              <label>
                Escribí <strong>DEVOLVER</strong> para confirmar
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoComplete="off"
                  placeholder="DEVOLVER"
                />
              </label>

              <p className="muted small">
                Acción irreversible: revierte contrato/reserva asociados y
                genera egreso CASH o refund MP según el medio.
              </p>

              {actionError ? <p className="error">{actionError}</p> : null}
              {actionOk ? <p className="ok-msg">{actionOk}</p> : null}
              {lastResult?.mpRefundManualPending ? (
                <p className="muted small">
                  El reembolso MP quedó marcado como manual pendiente: completar
                  en el panel de Mercado Pago del gym.
                </p>
              ) : null}

              <button
                type="submit"
                className="btn danger"
                disabled={!canSubmit}
              >
                {busy ? 'Ejecutando…' : 'Ejecutar devolución'}
              </button>
            </form>
          )}
        </Panel>
      </AdminGrid>
    </AdminShell>
  );
}
