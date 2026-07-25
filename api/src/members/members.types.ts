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
  method: 'STUB' | 'CASH';
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
 * Estado de cuenta (CU-AFI-004 / CU-AFI-005).
 *
 * @remarks `reservations` vacío hasta E4. `debt` placeholder hasta E5.
 */
export type MemberAccountDetail = {
  member: MemberDetail;
  summary: MemberAccountSummary;
  debt: MemberAccountDebt;
  contracts: ContractDetail[];
  recentPayments: MemberAccountPayment[];
  reservations: [];
};
