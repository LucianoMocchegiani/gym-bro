/**
 * Web del gym para el socio: alta con pago previo, compra y cuenta.
 */

import { apiRequest, newIdempotencyKey } from '@/lib/api/client';
import type { ListResult } from '@/lib/api/list';
import type { MemberAccountDetail } from '@/lib/api/members';
import type { MpCartCheckoutResult } from '@/lib/api/mercadopago';
import type { StorePack } from '@/lib/api/public-tenant-catalog';
import type { ReceiptDetail } from '@/lib/api/receipts';

export type MemberSignupCheckout = {
  signupId: string;
  checkoutUrl: string | null;
  sandboxCheckoutUrl: string | null;
};

export type MemberSignupStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export type MemberSignupView = {
  id: string;
  tenantId: string;
  status: MemberSignupStatus;
};

/**
 * Alta web (JWT Identity): guarda los datos y devuelve el link de Mercado
 * Pago. El socio nace recién con el pago aprobado; MP vuelve a `/cuenta?alta=`.
 */
export function startMemberSignup(input: {
  tenantSlug: string;
  packId: string;
  name: string;
  document: string;
  phone?: string;
}): Promise<MemberSignupCheckout> {
  return apiRequest<MemberSignupCheckout>('/identity/member-signups', {
    method: 'POST',
    body: input,
    auth: 'identity',
  });
}

export function getMemberSignup(id: string): Promise<MemberSignupView> {
  return apiRequest<MemberSignupView>(
    `/identity/member-signups/${encodeURIComponent(id)}`,
    { auth: 'identity' },
  );
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
