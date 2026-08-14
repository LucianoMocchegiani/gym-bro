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

/** Respuesta de Preference MP (pack o drop-in staff/member). */
export type MpCheckoutResult = {
  paymentId: string;
  status: MpCheckoutStatus;
  amount: number;
  kind: MpCheckoutKind;
  packId: string | null;
  sessionId: string | null;
  idempotencyKey: string;
  mpPreferenceId: string | null;
  checkoutUrl: string | null;
  sandboxCheckoutUrl: string | null;
  contractId: string | null;
  reservationId: string | null;
};

/**
 * URL preferida para abrir el checkout (sandbox si existe).
 */
export function pickMpCheckoutUrl(result: MpCheckoutResult): string | null {
  return result.sandboxCheckoutUrl ?? result.checkoutUrl;
}

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

/**
 * Checkout MP pack para un afiliado (staff, `members.write`). CU-PAG-001.
 */
export function startStaffMpPackCheckout(
  memberId: string,
  input: { packId: string; idempotencyKey?: string },
): Promise<MpCheckoutResult> {
  return apiRequest<MpCheckoutResult>(
    `/members/${memberId}/payments/mp/checkout`,
    {
      method: 'POST',
      body: input,
    },
  );
}

/**
 * Checkout MP drop-in para un afiliado (staff, `reservations.write`).
 *
 * @remarks La reserva se confirma al webhook APPROVED, no al crear Preference.
 */
export function startStaffMpDropInCheckout(
  memberId: string,
  input: { sessionId: string; idempotencyKey?: string },
): Promise<MpCheckoutResult> {
  return apiRequest<MpCheckoutResult>(
    `/members/${memberId}/payments/mp/drop-in-checkout`,
    {
      method: 'POST',
      body: input,
    },
  );
}
