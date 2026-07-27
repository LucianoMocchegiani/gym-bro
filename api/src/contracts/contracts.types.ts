/**
 * Detalle de saldo de créditos de una contratación.
 */
export type ContractCreditBalanceDetail = {
  id: string;
  serviceId: string;
  serviceName: string;
  initialAmount: number;
  remaining: number;
  expiresAt: Date | null;
};

/**
 * Pago asociado a la contratación (stub/caja).
 */
export type ContractPaymentDetail = {
  id: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  method: 'STUB' | 'CASH' | 'MP';
  idempotencyKey: string;
};

/**
 * Contratación expuesta por la API.
 */
export type ContractDetail = {
  id: string;
  tenantId: string;
  memberId: string;
  packId: string;
  packName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
  startsAt: Date;
  endsAt: Date | null;
  hasAccessLibre: boolean;
  payment: ContractPaymentDetail;
  creditBalances: ContractCreditBalanceDetail[];
  createdAt: Date;
  updatedAt: Date;
};
