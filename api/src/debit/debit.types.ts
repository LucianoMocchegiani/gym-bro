import type { DebitMandateStatus } from '@prisma/client';

/**
 * Mandato de débito expuesto a Caja (CU-PAG-010).
 */
export type DebitMandateDetail = {
  id: string;
  memberId: string;
  memberName: string | null;
  memberEmail: string;
  /** Mail de la cuenta MP que tiene que autorizar el link. */
  payerEmail: string;
  packId: string;
  packName: string;
  packPrice: number;
  status: DebitMandateStatus;
  attemptCount: number;
  lastError: string | null;
  lastChargedAt: string | null;
  nextChargeOn: string | null;
  initPoint: string | null;
  enrolledTransactionItemId: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Vista de un afiliado en la pestaña Débitos.
 */
export type MemberDebitView = {
  mandate: DebitMandateDetail | null;
  /** Contrato MONTHLY vigente (para `start_date` = vencimiento). */
  currentMonthly: {
    contractId: string;
    packId: string;
    packName: string;
    endsAt: string;
  } | null;
};

/**
 * Resultado de alta: `checkoutUrl` = `init_point` MP.
 */
export type DebitEnrollResult = {
  mandate: DebitMandateDetail;
  transactionId: string | null;
  receiptReady: boolean;
  checkoutUrl: string | null;
};
