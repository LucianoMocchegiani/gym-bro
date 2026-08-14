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

/**
 * Cancela un contrato ACTIVE (`PATCH /contracts/:id/status`).
 *
 * @remarks Pierde acceso libre y créditos (RN-SER-009). No reembolsa el pago.
 * `reason` opcional → auditoría; no se guarda en la fila del contrato.
 */
export function cancelContract(
  contractId: string,
  reason?: string,
): Promise<ContractDetail> {
  const trimmed = reason?.trim();
  return apiRequest<ContractDetail>(`/contracts/${contractId}/status`, {
    method: 'PATCH',
    body: {
      status: 'CANCELLED',
      ...(trimmed ? { reason: trimmed } : {}),
    },
  });
}
