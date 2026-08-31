'use client';

import { AdminModal } from '@/components/AdminModal';
import { PaymentLineCopy } from '@/components/PaymentLineCopy';
import type { ReceiptDetail } from '@/lib/api/receipts';
import { formatMoney } from '@/lib/cash-labels';

function formatMethod(method: ReceiptDetail['method']): string {
  switch (method) {
    case 'CASH':
      return 'Efectivo';
    case 'MP':
      return 'Mercado Pago';
    case 'STUB':
      return 'Stub';
    default:
      return method;
  }
}

type ReceiptPanelProps = {
  receipt: ReceiptDetail;
  onClose: () => void;
  title?: string;
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
}: ReceiptPanelProps) {
  const lines = receipt.lines ?? [];
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
          <dd>{formatMethod(receipt.method)}</dd>
        </div>
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
              <PaymentLineCopy line={line} />
              <p>{formatMoney(line.amount)}</p>
            </li>
          ))}
        </ul>
      ) : receipt.description ? (
        <p className="muted small">{receipt.description}</p>
      ) : null}
    </AdminModal>
  );
}
