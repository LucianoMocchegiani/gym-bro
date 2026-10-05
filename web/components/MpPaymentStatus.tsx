'use client';

import { useEffect, useState } from 'react';
import { AdminModal } from '@/components/AdminModal';
import { ApiClientError } from '@/lib/api/client';
import {
  getTransactionMpPayment,
  type MpPaymentFee,
  type MpPaymentStatusView,
} from '@/lib/api/mp-payment';
import { formatMoney } from '@/lib/cash-labels';

const STATUS_LABELS: Record<string, string> = {
  approved: 'Aprobado',
  authorized: 'Autorizado',
  pending: 'Pendiente',
  in_process: 'En revisión',
  in_mediation: 'En disputa',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
  refunded: 'Devuelto',
  charged_back: 'Contracargo',
};

const FEE_LABELS: Record<string, string> = {
  mercadopago_fee: 'Comisión de Mercado Pago',
  financing_fee: 'Costo de cuotas',
  application_fee: 'Comisión de la plataforma',
  shipping_fee: 'Envío',
};

function formatDate(iso: string, withTime = false): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    ...(withTime ? { timeStyle: 'short' as const } : {}),
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(iso));
}

function feeLabel(fee: MpPaymentFee): string {
  const label = FEE_LABELS[fee.type] ?? fee.type;
  return fee.payer === 'payer' ? `${label} (la paga el comprador)` : label;
}

function releaseCopy(view: MpPaymentStatusView): string {
  if (view.status !== 'approved') {
    return '—';
  }
  if (view.released) {
    return 'Ya disponible en tu cuenta';
  }
  if (view.moneyReleaseDate) {
    return `Pendiente de liberación: disponible el ${formatDate(view.moneyReleaseDate)}`;
  }
  return 'Pendiente de liberación (Mercado Pago no informó la fecha)';
}

/**
 * Estado del cobro según Mercado Pago: si se aprobó, cuánto le queda al gym,
 * cuándo se libera la plata y qué cuenta cobró.
 *
 * @remarks Consulta en el momento (`GET /transactions/:id/mp-payment`); no
 * depende de que el gym encuentre el movimiento en la app de MP.
 */
export function MpPaymentStatusDetails({
  transactionId,
}: {
  transactionId: string;
}) {
  const [result, setResult] = useState<{
    transactionId: string;
    view: MpPaymentStatusView | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTransactionMpPayment(transactionId)
      .then((view) => {
        if (!cancelled) setResult({ transactionId, view, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({
          transactionId,
          view: null,
          error:
            err instanceof ApiClientError
              ? err.message
              : 'No se pudo consultar Mercado Pago',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  if (result?.transactionId !== transactionId) {
    return <p className="muted small">Consultando Mercado Pago…</p>;
  }
  const { view, error } = result;
  if (error || !view) {
    return <p className="error">{error ?? 'Sin datos de Mercado Pago'}</p>;
  }

  return (
    <div>
      <dl className="detail-dl">
        <div>
          <dt>Estado</dt>
          <dd>
            <strong>{STATUS_LABELS[view.status] ?? view.status}</strong>
            {view.dateApproved
              ? ` · ${formatDate(view.dateApproved, true)}`
              : null}
          </dd>
        </div>
        <div>
          <dt>Pago MP</dt>
          <dd>#{view.mpPaymentId}</dd>
        </div>
        {view.amount !== null ? (
          <div>
            <dt>Cobrado</dt>
            <dd>{formatMoney(view.amount)}</dd>
          </div>
        ) : null}
        {view.fees.map((fee, i) => (
          <div key={`${fee.type}-${i}`}>
            <dt>{feeLabel(fee)}</dt>
            <dd>− {formatMoney(fee.amount)}</dd>
          </div>
        ))}
        {view.netReceivedAmount !== null ? (
          <div>
            <dt>Te queda</dt>
            <dd>
              <strong>{formatMoney(view.netReceivedAmount)}</strong>
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Plata</dt>
          <dd>{releaseCopy(view)}</dd>
        </div>
        <div>
          <dt>Cuenta que cobró</dt>
          <dd>
            {view.collectorMatches === true
              ? 'Tu cuenta de Mercado Pago conectada ✔'
              : view.collectorMatches === false
                ? `Otra cuenta de Mercado Pago (id ${view.collectorId})`
                : view.collectorId
                  ? `id ${view.collectorId}`
                  : '—'}
          </dd>
        </div>
      </dl>
      {view.collectorMatches === false ? (
        <p className="error">
          Este cobro no entró en la cuenta conectada ahora. Revisá en Config →
          Mercado Pago qué cuenta está conectada.
        </p>
      ) : null}
      <p className="muted small">
        Una venta puede estar aprobada y la plata todavía no disponible:
        Mercado Pago la libera según los plazos de tu cuenta.
      </p>
    </div>
  );
}

/** Modal con {@link MpPaymentStatusDetails}. */
export function MpPaymentStatusModal({
  transactionId,
  onClose,
}: {
  transactionId: string;
  onClose: () => void;
}) {
  return (
    <AdminModal open onClose={onClose} title="Estado en Mercado Pago">
      <MpPaymentStatusDetails transactionId={transactionId} />
    </AdminModal>
  );
}
