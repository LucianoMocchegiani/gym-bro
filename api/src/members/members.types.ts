import { ContractDetail } from '../contracts/contracts.types';

/**
 * Afiliado expuesto por la API (sin password).
 */
export type MemberDetail = {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  phone: string | null;
  document: string | null;
  imageUrl: string | null;
  branchId: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Resumen de deuda (placeholder hasta E5 / RN-TEN-004).
 */
export type MemberAccountDebt = {
  amount: number;
  status: 'AL_DIA' | 'EN_DEUDA';
};

/**
 * Pago reciente en estado de cuenta.
 */
export type MemberAccountPayment = {
  id: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  method: 'STUB' | 'CASH' | 'MP';
  packId: string | null;
  createdAt: Date;
};

/**
 * Totales derivados de contrataciones ACTIVE.
 */
export type MemberAccountSummary = {
  activeContracts: number;
  hasAccessLibre: boolean;
  totalCreditsRemaining: number;
};

/**
 * Resumen de reserva próxima en estado de cuenta.
 */
export type MemberAccountReservation = {
  id: string;
  sessionId: string;
  serviceName: string;
  startsAt: Date;
  endsAt: Date;
  status: 'CONFIRMED' | 'CANCELLED';
  coverage: 'CREDIT' | 'DROP_IN';
};

/**
 * Estado de cuenta (CU-AFI-004 / CU-AFI-005).
 *
 * @remarks `debt` placeholder hasta E5. `reservations` = CONFIRMED con `endsAt` ≥ ahora.
 */
export type MemberAccountDetail = {
  member: MemberDetail;
  summary: MemberAccountSummary;
  debt: MemberAccountDebt;
  contracts: ContractDetail[];
  recentPayments: MemberAccountPayment[];
  reservations: MemberAccountReservation[];
};
