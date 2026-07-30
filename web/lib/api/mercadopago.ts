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
