import { apiRequest } from '@/lib/api/client';
import type { MpCartItemInput, MpCheckoutStatus } from '@/lib/api/mercadopago';

export type MpPointQrCheckoutResult = {
  transactionId: string;
  memberId: string;
  status: MpCheckoutStatus;
  amount: number;
  idempotencyKey: string;
  mpOrderId: string | null;
  qrData: string | null;
};

export type MpPointQrOrderStatus = {
  orderId: string;
  status: string;
  approved: boolean;
};

export function startStaffMpPointQrCheckout(
  memberId: string,
  input: {
    items: MpCartItemInput[];
    idempotencyKey?: string;
    discountPercent?: number;
  },
): Promise<MpPointQrCheckoutResult> {
  return apiRequest<MpPointQrCheckoutResult>(
    `/members/${memberId}/transaction-items/mp/qr/cart`,
    { method: 'POST', body: input },
  );
}

export function getMpPointQrOrderStatus(
  transactionId: string,
): Promise<MpPointQrOrderStatus> {
  return apiRequest<MpPointQrOrderStatus>(
    `/transactions/${transactionId}/mp-qr-order`,
  );
}
