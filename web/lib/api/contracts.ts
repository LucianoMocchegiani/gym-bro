/**
 * Contracts API (módulo `contracts`).
 */

import { apiRequest, newIdempotencyKey } from '@/lib/api/client';

export type ContractCreditBalance = {
  id?: string;
  serviceId: string;
  serviceName: string;
  remaining: number;
  initialAmount?: number;
};

export type ContractDetail = {
  id: string;
  packId: string;
  packName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
  startsAt: string;
  endsAt: string | null;
  hasAccessLibre: boolean;
  creditBalances: ContractCreditBalance[];
};

/**
 * Contrata pack con pago CASH (entra a caja).
 */
export function createCashContract(
  memberId: string,
  packId: string,
  idempotencyKey: string = newIdempotencyKey('cash-pack'),
): Promise<ContractDetail> {
  return apiRequest<ContractDetail>(`/members/${memberId}/contracts`, {
    method: 'POST',
    body: {
      packId,
      method: 'CASH',
      idempotencyKey,
    },
  });
}
