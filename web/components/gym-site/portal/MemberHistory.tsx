'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AdminModal } from '@/components/AdminModal';
import { formatReceiptMethod, ReceiptPanel } from '@/components/ReceiptPanel';
import { StatusPill } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import {
  listMyReceipts,
  listMyRefundRequests,
  requestMyRefund,
} from '@/lib/api/member-portal';
import type { PaymentLineDetail } from '@/lib/api/payment-lines';
import type { ReceiptDetail } from '@/lib/api/receipts';
import { formatMoney } from '@/lib/cash-labels';

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

/** «Pack X», «3 ítems» o la descripción del comprobante. */
function receiptSummary(r: ReceiptDetail): string {
  if (r.lines.length === 1) {
    return r.lines[0].title;
  }
  if (r.lines.length > 1) {
    return `${r.lines.length} ítems`;
  }
  return r.description?.trim() || r.code;
}

type Page = { items: ReceiptDetail[]; page: number; hasMore: boolean };

/**
 * Historial del socio (RN-PAG-009): todos sus comprobantes (packs, clases
 * sueltas y devoluciones; Mercado Pago o efectivo) con detalle y pedido de
 * devolución por línea (CU-PAG-004), como el historial de la app.
 */
export function MemberHistory() {
  const [receipts, setReceipts] = useState<Page | null>(null);
  const [pendingRefunds, setPendingRefunds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState<ReceiptDetail | null>(null);
  const [refundLine, setRefundLine] = useState<PaymentLineDetail | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [first, requests] = await Promise.all([
          listMyReceipts(1),
          listMyRefundRequests(),
        ]);
        if (!cancelled) {
          setReceipts({
            items: first.items,
            page: 1,
            hasMore: first.hasMore,
          });
          setPendingRefunds(
            new Set(
              requests
                .filter((r) => r.status === 'PENDING')
                .map((r) => r.transactionItemId),
            ),
          );
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(errorText(err, 'No se pudo cargar el historial'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function loadMore() {
    if (!receipts) {
      return;
    }
    setLoadingMore(true);
    try {
      const next = await listMyReceipts(receipts.page + 1);
      setReceipts({
        items: [...receipts.items, ...next.items],
        page: receipts.page + 1,
        hasMore: next.hasMore,
      });
    } catch (err) {
      setError(errorText(err, 'No se pudieron cargar más comprobantes'));
    } finally {
      setLoadingMore(false);
    }
  }

  function lineAction(receipt: ReceiptDetail) {
    return function RefundAction(line: PaymentLineDetail) {
      if (pendingRefunds.has(line.id)) {
        return <p className="muted small">Devolución solicitada</p>;
      }
      if (
        receipt.concept === 'REFUND' ||
        (line.status ?? 'APPROVED') !== 'APPROVED'
      ) {
        return null;
      }
      return (
        <button
          type="button"
          className="btn ghost small"
          onClick={() => setRefundLine(line)}
        >
          Solicitar devolución
        </button>
      );
    };
  }

  return (
    <section className="mkt-inner mkt-section">
      <p className="eyebrow">Historial</p>
      <h2 className="mkt-h2">Tus comprobantes</h2>
      {notice ? <p className="success">{notice}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {!receipts ? (
        error ? null : <p className="muted">Cargando comprobantes…</p>
      ) : receipts.items.length === 0 ? (
        <p className="muted">Todavía no tenés comprobantes.</p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Comprobante</th>
                  <th>Fecha</th>
                  <th>Detalle</th>
                  <th>Medio</th>
                  <th>Importe</th>
                  <th>Tipo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {receipts.items.map((r) => (
                  <tr key={r.id}>
                    <td>{r.code}</td>
                    <td>{new Date(r.createdAt).toLocaleDateString('es-AR')}</td>
                    <td>{receiptSummary(r)}</td>
                    <td>{formatReceiptMethod(r.method)}</td>
                    <td>{formatMoney(r.amount)}</td>
                    <td>
                      {r.concept === 'REFUND' ? (
                        <StatusPill tone="danger">Devolución</StatusPill>
                      ) : (
                        <StatusPill tone="ok">Pago</StatusPill>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn ghost small"
                        onClick={() => setOpen(r)}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {receipts.hasMore ? (
            <button
              type="button"
              className="mkt-btn-ghost"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? 'Cargando…' : 'Ver más'}
            </button>
          ) : null}
        </>
      )}

      {open && !refundLine ? (
        <ReceiptPanel
          receipt={open}
          onClose={() => setOpen(null)}
          lineAction={lineAction(open)}
        />
      ) : null}
      {refundLine ? (
        <RefundRequestModal
          line={refundLine}
          onClose={() => setRefundLine(null)}
          onSent={() => {
            setRefundLine(null);
            setOpen(null);
            setNotice('Solicitud de devolución enviada. El gym te avisa cuando la resuelva.');
            setReloadKey((k) => k + 1);
          }}
        />
      ) : null}
    </section>
  );
}

function RefundRequestModal({
  line,
  onClose,
  onSent,
}: {
  line: PaymentLineDetail;
  onClose: () => void;
  onSent: () => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await requestMyRefund(line.id, reason.trim() || undefined);
      onSent();
    } catch (err) {
      setError(errorText(err, 'No se pudo enviar la solicitud'));
      setSending(false);
    }
  }

  return (
    <AdminModal
      open
      onClose={() => {
        if (!sending) onClose();
      }}
      title="Solicitar devolución"
      description={`${line.title} · ${formatMoney(line.amount)}`}
    >
      <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
        {error ? <p className="error">{error}</p> : null}
        <label>
          Motivo (opcional)
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </label>
        <div className="admin-modal-actions">
          <button
            type="button"
            className="btn ghost"
            disabled={sending}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button type="submit" className="btn" disabled={sending}>
            {sending ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
