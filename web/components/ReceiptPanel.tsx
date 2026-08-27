'use client';

import { AdminModal } from '@/components/AdminModal';
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

function formatConcept(concept: ReceiptDetail['concept']): string {
  switch (concept) {
    case 'PACK_CONTRACT':
      return 'Pack / contrato';
    case 'DROP_IN':
      return 'Drop-in';
    default:
      return concept;
  }
}

type ReceiptPanelProps = {
  receipt: ReceiptDetail;
  onClose: () => void;
  title?: string;
};

/**
 * Modal de comprobante interno (RN-PAG-009).
 */
export function ReceiptPanel({
  receipt,
  onClose,
  title = 'Comprobante',
}: ReceiptPanelProps) {
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
          <dt>Concepto</dt>
          <dd>{formatConcept(receipt.concept)}</dd>
        </div>
        {receipt.description ? (
          <div>
            <dt>Detalle</dt>
            <dd>{receipt.description}</dd>
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
    </AdminModal>
  );
}
