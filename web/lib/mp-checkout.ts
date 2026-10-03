import { ApiClientError } from '@/lib/api/client';
import {
  pickMpCartCheckoutUrl,
  type MpCartCheckoutResult,
} from '@/lib/api/mercadopago';

/** Navega al checkout de Mercado Pago (Checkout Pro). */
export function redirectToMpCheckout(
  result: Pick<MpCartCheckoutResult, 'checkoutUrl' | 'sandboxCheckoutUrl'>,
): void {
  const url = pickMpCartCheckoutUrl(result);
  if (!url) {
    throw new Error('Mercado Pago no devolvió el link de pago');
  }
  window.location.assign(url);
}

export function mpCheckoutErrorText(err: unknown): string {
  return err instanceof ApiClientError || err instanceof Error
    ? err.message
    : 'No se pudo iniciar el pago';
}
