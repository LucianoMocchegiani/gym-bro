/**
 * Mercado Pago account API (módulo `mercadopago`).
 */

import { apiRequest } from '@/lib/api/client';

export type MercadoPagoAccountStatus = {
  connected: boolean;
  publicKeyMasked: string | null;
  mpUserId: string | null;
  lastValidatedAt: string | null;
  lastValidationOk: boolean | null;
  updatedAt: string | null;
};

export type MercadoPagoAccountTestResult = {
  ok: boolean;
  mpUserId: string | null;
  nickname: string | null;
  validatedAt: string;
};

export type UpsertMercadoPagoAccountInput = {
  accessToken: string;
  publicKey: string;
  validate?: boolean;
};

export type MpCheckoutKind = 'PACK' | 'DROP_IN';

export type MpCheckoutStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'REFUNDED';

/**
 * Estado de cuenta MP (`mp.connect`).
 */
export function getMercadoPagoAccount(): Promise<MercadoPagoAccountStatus> {
  return apiRequest<MercadoPagoAccountStatus>('/mercadopago/account');
}

/**
 * Conectar o reemplazar cuenta MP.
 */
export function upsertMercadoPagoAccount(
  input: UpsertMercadoPagoAccountInput,
): Promise<MercadoPagoAccountStatus> {
  return apiRequest<MercadoPagoAccountStatus>('/mercadopago/account', {
    method: 'PUT',
    body: input,
  });
}

/**
 * Probar credenciales guardadas.
 */
export function testMercadoPagoAccount(): Promise<MercadoPagoAccountTestResult> {
  return apiRequest<MercadoPagoAccountTestResult>('/mercadopago/account/test', {
    method: 'POST',
  });
}

/**
 * Desconectar cuenta MP.
 */
export function disconnectMercadoPagoAccount(): Promise<MercadoPagoAccountStatus> {
  return apiRequest<MercadoPagoAccountStatus>('/mercadopago/account', {
    method: 'DELETE',
  });
}

export type MpCartItemInput = {
  kind: MpCheckoutKind;
  id: string;
  quantity?: number;
};

export type MpCartLine = {
  kind: MpCheckoutKind;
  refId: string;
  quantity: number;
  amount: number;
  transactionItemIds: string[];
};

/** Respuesta de checkout de carrito MP (1 preference → 1 pago). */
export type MpCartCheckoutResult = {
  transactionId: string;
  memberId: string;
  status: MpCheckoutStatus;
  amount: number;
  idempotencyKey: string;
  mpPreferenceId: string | null;
  checkoutUrl: string | null;
  sandboxCheckoutUrl: string | null;
  lines: MpCartLine[];
};

/**
 * Checkout MP de carrito para un afiliado (staff, `members.write`).
 *
 * @remarks Modelo MercadoLibre: un solo total y un solo pago. Cada pack /
 * reserva del carrito se activa al aprobarse el pago (webhook APPROVED).
 */
export function startStaffMpCartCheckout(
  memberId: string,
  input: { items: MpCartItemInput[]; idempotencyKey?: string },
): Promise<MpCartCheckoutResult> {
  return apiRequest<MpCartCheckoutResult>(
    `/members/${memberId}/transaction-items/mp/cart`,
    {
      method: 'POST',
      body: input,
    },
  );
}

/**
 * URL preferida para abrir un checkout MP.
 *
 * @remarks MP recomienda usar `init_point` (no `sandbox_init_point`)
 * para Checkout Pro en test. El init_point redirige al checkout correcto
 * según el entorno del token.
 */
export function pickMpCartCheckoutUrl(
  result: MpCartCheckoutResult,
): string | null {
  return result.checkoutUrl ?? result.sandboxCheckoutUrl;
}
