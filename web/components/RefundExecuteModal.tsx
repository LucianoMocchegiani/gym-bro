'use client';

import { FormEvent, useMemo, useState } from 'react';
import { AdminModal } from '@/components/AdminModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PaymentLineCopy } from '@/components/PaymentLineCopy';
import { ApiClientError } from '@/lib/api/client';
import type { PaymentLineDetail } from '@/lib/api/payment-lines';
import {
  executeTransactionRefund,
  type RefundMotiveCode,
} from '@/lib/api/refunds';
import { formatMoney } from '@/lib/cash-labels';

/**
 * Picker + confirm de devolución sobre un cart (CU-PAG-005).
 *
 * @remarks Un confirm = un refund MP (suma) y un egreso. Ítems ya
 * `REFUNDED` quedan deshabilitados. CASH y MP usan el mismo flujo.
 */
export function RefundExecuteModal({
  open,
  transactionId,
  items,
  onClose,
  onDone,
}: {
  open: boolean;
  transactionId: string;
  items: PaymentLineDetail[];
  onClose: () => void;
  onDone: () => void;
}) {
  const refundable = items.filter((i) => (i.status ?? 'APPROVED') === 'APPROVED');
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    refundable.map((i) => i.id),
  );
  const [reason, setReason] = useState('');
  const [motiveCode, setMotiveCode] = useState<RefundMotiveCode>('otro');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedAmount = useMemo(
    () =>
      items
        .filter((i) => selectedIds.includes(i.id))
        .reduce((sum, i) => sum + i.amount, 0),
    [items, selectedIds],
  );

  const canSubmit =
    selectedIds.length > 0 && reason.trim().length >= 3 && !busy;

  function toggle(id: string, enabled: boolean) {
    if (!enabled) {
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleAll() {
    if (selectedIds.length === refundable.length) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(refundable.map((i) => i.id));
  }

  function handleClose() {
    if (busy) {
      return;
    }
    setConfirmOpen(false);
    setActionError(null);
    onClose();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }
    setConfirmOpen(true);
  }

  async function doExecute() {
    setBusy(true);
    setActionError(null);
    try {
      await executeTransactionRefund(transactionId, {
        transactionItemIds: selectedIds,
        reason: reason.trim(),
        motiveCode,
      });
      setConfirmOpen(false);
      onDone();
    } catch (err) {
      setConfirmOpen(false);
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
    <>
      <AdminModal
        open={open}
        onClose={handleClose}
        title="Devolver"
        description="Elegí qué ítems del cobro se revierten. Un confirm, un egreso."
      >
        <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
          {refundable.length > 1 ? (
            <label className="refund-pick-all">
              <input
                type="checkbox"
                checked={
                  refundable.length > 0 &&
                  selectedIds.length === refundable.length
                }
                onChange={toggleAll}
              />
              Seleccionar todo
            </label>
          ) : null}

          <ul className="receipt-lines">
            {items.map((line) => {
              const enabled = (line.status ?? 'APPROVED') === 'APPROVED';
              const checked = selectedIds.includes(line.id);
              return (
                <li key={line.id} className="cart-line refund-pick-line">
                  <label className={enabled ? undefined : 'muted'}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!enabled}
                      onChange={() => toggle(line.id, enabled)}
                    />
                    <span>
                      <PaymentLineCopy line={line} />
                      {!enabled ? (
                        <p className="muted small">Ya devuelto</p>
                      ) : null}
                    </span>
                    <span>{formatMoney(line.amount)}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          <p>
            A devolver: <strong>{formatMoney(selectedAmount)}</strong>
          </p>

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
              onClick={handleClose}
              disabled={busy}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn danger"
              disabled={!canSubmit}
            >
              Devolver
            </button>
          </div>
        </form>
      </AdminModal>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar devolución"
        description={`Se devolverán ${selectedIds.length} ítem(s) por ${formatMoney(selectedAmount)}. Revierte contrato/reserva y genera egreso (CASH) o refund MP.`}
        confirmLabel="Ejecutar devolución"
        tone="danger"
        confirmWord="DEVOLVER"
        busy={busy}
        onConfirm={() => {
          void doExecute();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
