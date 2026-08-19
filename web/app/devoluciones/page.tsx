'use client';

import Link from 'next/link';
import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { memberFichaHref } from '@/lib/member-link';
import {
  DataTable,
  ListFilterField,
  ListToolbar,
  listCountDescription,
} from '@/components/AdminList';
import { AdminModal } from '@/components/AdminModal';
import { AdminShell } from '@/components/AdminShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RequireStaff } from '@/components/RequireStaff';
import { PageSkeleton } from '@/components/Skeleton';
import {
  IconView,
  RowActions,
  RowIconButton,
} from '@/components/RowActions';
import {
  StatusPill,
  refundStatusLabel,
  refundStatusTone,
} from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import { getMember } from '@/lib/api/members';
import {
  executeRefund,
  listRefundRequests,
} from '@/lib/api/refunds';
import type {
  RefundMotiveCode,
  RefundRequestDetail,
  RefundRequestStatus,
} from '@/lib/api/refunds';
import { formatMoney } from '@/lib/cash-labels';

type StatusFilter = RefundRequestStatus | 'ALL';

type MemberLabelMap = Record<string, string>;

const PAGE_SIZE = 20;

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
 * Cola de solicitudes + devolución en modal (CU-PAG-005 / CU-PAG-007).
 *
 * @remarks Requiere permiso API `payments.refund`. `?paymentId=` abre el modal
 * de devolución directa (p. ej. desde ficha afiliado).
 */
export default function DevolucionesPage() {
  return (
    <RequireStaff>
      <Suspense fallback={<PageSkeleton />}>
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
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [memberLabels, setMemberLabels] = useState<MemberLabelMap>({});
  const [flashOk, setFlashOk] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(Boolean(prefillPaymentId));
  const [selected, setSelected] = useState<RefundRequestDetail | null>(null);
  const [directPaymentId, setDirectPaymentId] = useState(prefillPaymentId);
  const [reason, setReason] = useState(
    prefillPaymentId ? 'Doble cobro' : '',
  );
  const [motiveCode, setMotiveCode] = useState<RefundMotiveCode>(
    prefillPaymentId ? 'doble_cobro' : 'solicitud',
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listRefundRequests({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
        pageSize: PAGE_SIZE,
        order: 'desc',
        orderBy: 'createdAt',
      });
      setItems(result.items);
      setTotal(result.total);
      setHasMore(result.hasMore);
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
      setHasMore(false);
      setLoadError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudieron cargar las solicitudes',
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    // Fetch remoto al cambiar filtro/página.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga API
    void load();
  }, [load]);

  const paymentIdToExecute = selected?.paymentId ?? directPaymentId.trim();
  const canExecute =
    !selected || selected.status === 'PENDING';

  const canSubmit = useMemo(() => {
    return (
      canExecute &&
      Boolean(paymentIdToExecute) &&
      reason.trim().length >= 3 &&
      !busy
    );
  }, [canExecute, paymentIdToExecute, reason, busy]);

  function resetForm(opts?: {
    paymentId?: string;
    request?: RefundRequestDetail | null;
  }) {
    const request = opts?.request ?? null;
    const paymentId = opts?.paymentId ?? '';
    setSelected(request);
    setDirectPaymentId(paymentId);
    setConfirmOpen(false);
    setActionError(null);
    if (request?.status === 'PENDING') {
      setMotiveCode('solicitud');
      setReason(request.reason?.trim() || 'Solicitud del afiliado');
    } else if (paymentId) {
      setMotiveCode('doble_cobro');
      setReason('Doble cobro');
    } else {
      setMotiveCode('solicitud');
      setReason('');
    }
  }

  function openDirect() {
    setFlashOk(null);
    resetForm();
    setModalOpen(true);
  }

  function openRequest(row: RefundRequestDetail) {
    setFlashOk(null);
    resetForm({ request: row });
    setModalOpen(true);
  }

  function closeModal() {
    if (busy) {
      return;
    }
    setModalOpen(false);
    resetForm();
  }

  async function onExecute(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !paymentIdToExecute) {
      return;
    }
    setConfirmOpen(true);
  }

  async function doExecute() {
    if (!paymentIdToExecute) {
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const result = await executeRefund(paymentIdToExecute, {
        reason: reason.trim(),
        motiveCode,
        ...(selected ? { refundRequestId: selected.id } : {}),
      });
      const mpNote = result.mpRefundManualPending
        ? ' (MP manual pendiente)'
        : '';
      setFlashOk(
        `Devolución OK: ${formatMoney(result.amount)} · ${result.method}${mpNote}`,
      );
      setModalOpen(false);
      resetForm();
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

  const modalTitle = selected
    ? selected.status === 'PENDING'
      ? 'Ejecutar solicitud'
      : 'Solicitud'
    : 'Devolución directa';

  const modalDescription = selected
    ? `Solicitud ${selected.id.slice(0, 8)}… · pago ${selected.paymentId.slice(0, 8)}…`
    : 'Para doble cobro u otras devoluciones sin solicitud PENDING.';

  return (
    <AdminShell
      title="Devoluciones"
      actions={
        <button type="button" className="btn" onClick={openDirect}>
          + Devolución directa
        </button>
      }
    >
      <ListToolbar hint="Requiere permiso payments.refund.">
        <ListFilterField
          label="Estado"
          value={statusFilter}
          onChange={(v) => {
            setPage(1);
            setStatusFilter(v as StatusFilter);
          }}
        >
          <option value="PENDING">Pendientes</option>
          <option value="EXECUTED">Ejecutadas</option>
          <option value="REJECTED">Rechazadas (política)</option>
          <option value="ALL">Todas</option>
        </ListFilterField>
      </ListToolbar>

      {flashOk ? <p className="ok-msg">{flashOk}</p> : null}

      <DataTable
        title="Solicitudes"
        description={listCountDescription(
          total,
          page,
          'solicitud',
          'solicitudes',
        )}
        loading={loading}
        error={loadError}
        isEmpty={items.length === 0}
        emptyText="No hay solicitudes en este filtro."
        page={page}
        hasMore={hasMore}
        onPageChange={setPage}
        header={
          <>
            <th>Fecha</th>
            <th>Afiliado</th>
            <th>Estado</th>
            <th>Motivo</th>
            <th />
          </>
        }
      >
        {items.map((row) => (
          <tr key={row.id}>
            <td>{formatWhen(row.createdAt)}</td>
            <td>
              <Link
                href={memberFichaHref(
                  row.memberId,
                  memberLabels[row.memberId] ?? '',
                )}
              >
                {memberLabels[row.memberId] ?? row.memberId.slice(0, 8)}
              </Link>
            </td>
            <td>
              <StatusPill tone={refundStatusTone(row.status)}>
                {refundStatusLabel(row.status)}
              </StatusPill>
            </td>
            <td className="muted small">
              {row.reason ?? row.rejectionReason ?? '—'}
            </td>
            <td>
              <RowActions>
                {row.status === 'PENDING' ? (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => openRequest(row)}
                  >
                    Ejecutar
                  </button>
                ) : (
                  <RowIconButton
                    label="Ver"
                    onClick={() => openRequest(row)}
                  >
                    <IconView />
                  </RowIconButton>
                )}
              </RowActions>
            </td>
          </tr>
        ))}
      </DataTable>

      <AdminModal
        open={modalOpen}
        onClose={closeModal}
        title={modalTitle}
        description={modalDescription}
      >
        {selected && selected.status !== 'PENDING' ? (
          <div className="admin-stack">
            <p>
              Estado:{' '}
              <StatusPill tone={refundStatusTone(selected.status)}>
                {refundStatusLabel(selected.status)}
              </StatusPill>
            </p>
            {selected.rejectionReason ? (
              <p className="muted">
                Rechazo política: {selected.rejectionReason}
              </p>
            ) : null}
            <p className="muted small">
              Solo las pendientes se pueden ejecutar. Para otro pago usá
              devolución directa.
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => {
                resetForm();
              }}
            >
              Abrir devolución directa
            </button>
          </div>
        ) : (
          <form className="admin-form" onSubmit={(e) => void onExecute(e)}>
            {!selected ? (
              <label>
                ID del pago
                <input
                  value={directPaymentId}
                  onChange={(e) => setDirectPaymentId(e.target.value)}
                  placeholder="uuid del payment"
                  required
                  autoComplete="off"
                />
              </label>
            ) : (
              <p className="muted small">
                Afiliado:{' '}
                <Link
                  href={memberFichaHref(
                    selected.memberId,
                    memberLabels[selected.memberId] ?? '',
                  )}
                >
                  {memberLabels[selected.memberId] ?? selected.memberId}
                </Link>
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

            {actionError ? <p className="error">{actionError}</p> : null}

            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={closeModal}
                disabled={busy}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn danger"
                disabled={!canSubmit}
              >
                {busy ? 'Ejecutando…' : 'Ejecutar devolución'}
              </button>
            </div>
          </form>
        )}
      </AdminModal>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar devolución"
        description="Acción irreversible: revierte contrato/reserva asociados y genera egreso CASH o refund MP según el medio."
        confirmLabel="Ejecutar devolución"
        tone="danger"
        confirmWord="DEVOLVER"
        busy={busy}
        onConfirm={() => {
          setConfirmOpen(false);
          void doExecute();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </AdminShell>
  );
}
