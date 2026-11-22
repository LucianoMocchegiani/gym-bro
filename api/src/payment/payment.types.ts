import type { ReceiptDetail } from '../receipts/receipts.types';

export type MpCheckoutStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';

export type MpCartLine = {
  kind: 'PACK' | 'DROP_IN';
  refId: string;
  packId?: string;
  title?: string;
  description?: string;
  quantity: number;
  amount: number;
  listAmount?: number;
  discountBps?: number;
  transactionItemIds: string[];
};

export type MpCartCheckoutResult = {
  transactionId: string;
  memberId: string | null;
  status: MpCheckoutStatus;
  amount: number;
  idempotencyKey: string;
  mpPreferenceId: string | null;
  checkoutUrl: string | null;
  sandboxCheckoutUrl: string | null;
  lines: MpCartLine[];
};

export type MpSignupPreference = {
  amount: number;
  preferenceId: string;
  checkoutUrl: string | null;
  sandboxCheckoutUrl: string | null;
};

export type MpWebhookProcessResult = {
  handled: boolean;
  transactionItemId: string | null;
  transactionId: string | null;
  status: string | null;
  contractId: string | null;
  reservationId: string | null;
};

export type CashCartResult = {
  transactionId: string;
  amount: number;
  status: string;
  transactionItems: Array<{
    id: string;
    sessionId: string | null;
    packId: string | null;
    amount: number;
  }>;
  receipt: ReceiptDetail | null;
};

export type MpPaymentStatusView = {
  mpPaymentId: string;
  status: string;
  statusDetail: string | null;
  dateApproved: string | null;
  amount: number | null;
  netReceivedAmount: number | null;
  fees: Array<{ type: string; amount: number; payer: string | null }>;
  feesTotal: number;
  moneyReleaseDate: string | null;
  moneyReleaseStatus: string | null;
  released: boolean;
  collectorId: string | null;
  collectorMatches: boolean | null;
};
