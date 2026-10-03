/**
 * Web del gym para el socio: alta self-service, compra y cuenta (JWT de socio).
 */

import { apiRequest, newIdempotencyKey } from '@/lib/api/client';
import type { ListResult } from '@/lib/api/list';
import type { MemberAccountDetail } from '@/lib/api/members';
import type { MpCartCheckoutResult } from '@/lib/api/mercadopago';
import type { StorePack } from '@/lib/api/public-tenant-catalog';
import type { ReceiptDetail } from '@/lib/api/receipts';

export type SelfJoinResult = {
  tenantId: string;
  memberId: string;
  /** false = ya era socio activo. */
  created: boolean;
};

/**
 * La cuenta Faciliter se hace socia del gym (JWT Identity). Queda ACTIVE.
 */
export function selfJoinGym(input: {
  tenantSlug: string;
  name: string;
  document: string;
  phone?: string;
}): Promise<SelfJoinResult> {
  return apiRequest<SelfJoinResult>('/identity/memberships', {
    method: 'POST',
    body: input,
    auth: 'identity',
  });
}

export function listMyStorePacks(): Promise<StorePack[]> {
  return apiRequest<StorePack[]>('/me/packs', { auth: 'member' });
}

/**
 * Checkout MP de un pack; al terminar MP vuelve a `/cuenta?compra=`.
 */
export function startMyPackCheckout(
  packId: string,
): Promise<MpCartCheckoutResult> {
  return apiRequest<MpCartCheckoutResult>('/me/transaction-items/mp/cart', {
    method: 'POST',
    body: {
      items: [{ kind: 'PACK', id: packId }],
      idempotencyKey: newIdempotencyKey('web-pack'),
      returnToWeb: true,
    },
    auth: 'member',
  });
}

/** Packs vigentes hoy, créditos y pagos recientes. */
export function getMyAccount(): Promise<MemberAccountDetail> {
  return apiRequest<MemberAccountDetail>('/me/account', { auth: 'member' });
}

export function listMyReceipts(): Promise<ListResult<ReceiptDetail>> {
  return apiRequest<ListResult<ReceiptDetail>>('/me/receipts?pageSize=20', {
    auth: 'member',
  });
}
