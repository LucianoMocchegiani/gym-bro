import type { DebitMandateStatus } from '@prisma/client';

/**
 * Mandato de débito expuesto a Caja (CU-PAG-010).
 */
export type DebitMandateDetail = {
  id: string;
  memberId: string;
  memberName: string | null;
  memberEmail: string;
  packId: string;
  packName: string;
  packPrice: number;
  status: DebitMandateStatus;
  attemptCount: number;
  lastError: string | null;
  lastChargedAt: string | null;
  nextChargeOn: string;
  cardLastFour: string | null;
  enrolledTransactionItemId: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Vista de un afiliado en la pestaña Débitos.
 */
export type MemberDebitView = {
  mandate: DebitMandateDetail | null;
  /** Contrato MONTHLY vigente (para autorizar tarjeta sin cobro). */
  currentMonthly: {
    contractId: string;
    packId: string;
    packName: string;
    endsAt: string;
  } | null;
};

/**
 * Resultado de alta / cobro de mandato.
 */
export type DebitEnrollResult = {
  mandate: DebitMandateDetail;
  transactionId: string | null;
  receiptReady: boolean;
};
