import type { PaymentLineDetail } from '@/lib/api/payment-lines';
import {
  formatPaymentLineMeta,
  formatPaymentLineService,
} from '@/lib/payment-line-labels';

/**
 * Título + meta + servicios del pack (mismo copy en comprobante y reportes).
 */
export function PaymentLineCopy({ line }: { line: PaymentLineDetail }) {
  const services = line.services ?? [];
  return (
    <div className="payment-line-copy">
      <p className="cart-name">{line.title}</p>
      <p className="muted small">{formatPaymentLineMeta(line)}</p>
      {services.length > 0
        ? services.map((s) => (
            <p key={s.name} className="muted small">
              {formatPaymentLineService(s)}
            </p>
          ))
        : null}
    </div>
  );
}
