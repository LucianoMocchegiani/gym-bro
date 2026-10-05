'use client';

import { useState, type ReactNode } from 'react';
import { AdminModal } from '@/components/AdminModal';
import { MpPaymentStatusDetails } from '@/components/MpPaymentStatus';
import { PaymentLineCopy } from '@/components/PaymentLineCopy';
import type { PaymentLineDetail } from '@/lib/api/payment-lines';
import type { ReceiptDetail } from '@/lib/api/receipts';
import { formatMoney } from '@/lib/cash-labels';

export function formatReceiptMethod(method: ReceiptDetail['method']): string {
  switch (method) {
    case 'CASH':
      return 'Efectivo';
    case 'MP':
      return 'Mercado Pago';
    case 'TRANSFER':
      return 'Transferencia';
    case 'STUB':
      return 'Stub';
    default:
      return method;
  }
}

export function formatDiscountPercent(percent: number): string {
  return `${percent.toLocaleString('es-AR', { maximumFractionDigits: 2 })} %`;
}

function LineAmount({ line }: { line: PaymentLineDetail }) {
  if (!line.listAmount || !line.discountPercent) {
    return <p>{formatMoney(line.amount)}</p>;
  }
  return (
    <p>
      <span className="muted small">
        <s>{formatMoney(line.listAmount)}</s> −
        {formatDiscountPercent(line.discountPercent)}
      </span>{' '}
      {formatMoney(line.amount)}
    </p>
  );
}

type ReceiptPanelProps = {
  receipt: ReceiptDetail;
  onClose: () => void;
  title?: string;
  /** Acción bajo cada línea (p. ej. «Solicitar devolución» del socio). */
  lineAction?: (line: PaymentLineDetail) => ReactNode;
  /** Staff: botón «Estado en Mercado Pago» en cobros MP. */
  showMpStatus?: boolean;
};

/**
 * Modal de comprobante interno (RN-PAG-009).
 *
 * @remarks Muestra las líneas del cart (pack + servicios, o drop-in/reserva).
 */
export function ReceiptPanel({
  receipt,
  onClose,
  title = 'Comprobante',
  lineAction,
  showMpStatus = false,
}: ReceiptPanelProps) {
  const lines = receipt.lines ?? [];
  const [mpOpen, setMpOpen] = useState(false);
  const mpTransactionId =
    showMpStatus && receipt.method === 'MP' && receipt.concept !== 'REFUND'
      ? receipt.transactionId
      : null;
  return (
    <AdminModal open onClose={onClose} title={title} description={receipt.code}>
      <dl className="detail-dl">
        <div>
          <dt>Código</dt>
          <dd>
            <strong>{receipt.code}</strong>
          </dd>
        </div>
        <div>
          <dt>Monto</dt>
          <dd>{formatMoney(receipt.amount)}</dd>
        </div>
        <div>
          <dt>Medio</dt>
          <dd>{formatReceiptMethod(receipt.method)}</dd>
        </div>
        {receipt.transferReference ? (
          <div>
            <dt>Referencia</dt>
            <dd>{receipt.transferReference}</dd>
          </div>
        ) : null}
        <div>
          <dt>Emitido</dt>
          <dd>
            {new Date(receipt.createdAt).toLocaleString('es-AR', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </dd>
        </div>
      </dl>
      {lines.length > 0 ? (
        <ul className="receipt-lines">
          {lines.map((line) => (
            <li key={line.id} className="cart-line">
              {lineAction ? (
                <div>
                  <PaymentLineCopy line={line} />
                  {lineAction(line)}
                </div>
              ) : (
                <PaymentLineCopy line={line} />
              )}
              <LineAmount line={line} />
            </li>
          ))}
        </ul>
      ) : receipt.description ? (
        <p className="muted small">{receipt.description}</p>
      ) : null}
      {mpTransactionId ? (
        mpOpen ? (
          <MpPaymentStatusDetails transactionId={mpTransactionId} />
        ) : (
          <button
            type="button"
            className="btn ghost"
            onClick={() => setMpOpen(true)}
          >
            Estado en Mercado Pago
          </button>
        )
      ) : null}
    </AdminModal>
  );
}
