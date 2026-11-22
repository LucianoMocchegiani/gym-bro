import { apiRequest } from '@/lib/api/client';
import { getCajaMpDiscountPercent } from '@/lib/api/caja-mp-discount';

export type MercadoPagoAccountStatus = {
  connected: boolean;
  publicKeyMasked: string | null;
  mpUserId: string | null;
  lastValidatedAt: string | null;
  lastValidationOk: boolean | null;
  updatedAt: string | null;
  connectionMode: 'MANUAL' | 'OAUTH' | null;
  tokenExpiresAt: string | null;
  needsReconnect: boolean;
  oauthAvailable: boolean;
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

export type MercadoPagoQrSetupStatus = {
  configured: boolean;
  storeId: string | null;
  posId: string | null;
};

export type CreateMercadoPagoQrSetupInput = {
  streetName: string;
  streetNumber: string;
  cityName: string;
  stateName: string;
  latitude: number;
  longitude: number;
};

export type MpCheckoutKind = 'PACK' | 'DROP_IN';
export type MpCheckoutStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';

export function getMercadoPagoAccount(): Promise<MercadoPagoAccountStatus> {
  return apiRequest<MercadoPagoAccountStatus>('/mercadopago/account');
}

export function getMercadoPagoQrSetup(): Promise<MercadoPagoQrSetupStatus> {
  return apiRequest<MercadoPagoQrSetupStatus>('/mercadopago/account/qr-setup');
}

export function createMercadoPagoQrSetup(
  input: CreateMercadoPagoQrSetupInput,
): Promise<MercadoPagoQrSetupStatus> {
  return apiRequest<MercadoPagoQrSetupStatus>('/mercadopago/account/qr-setup', {
    method: 'POST',
    body: input,
  });
}

export function startMercadoPagoOAuth(): Promise<{ authorizationUrl: string }> {
  return apiRequest<{ authorizationUrl: string }>(
    '/mercadopago/account/oauth/start',
    { method: 'POST' },
  );
}

export function upsertMercadoPagoAccount(
  input: UpsertMercadoPagoAccountInput,
): Promise<MercadoPagoAccountStatus> {
  return apiRequest<MercadoPagoAccountStatus>('/mercadopago/account', {
    method: 'PUT',
    body: input,
  });
}

export function testMercadoPagoAccount(): Promise<MercadoPagoAccountTestResult> {
  return apiRequest<MercadoPagoAccountTestResult>('/mercadopago/account/test', {
    method: 'POST',
  });
}

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

export type MpCartCheckoutResult = {
  transactionId: string;
  memberId: string | null;
  status: MpCheckoutStatus;
  amount: number;
  idempotencyKey: string;
  mpPreferenceId: string | null;
  checkoutUrl: string | null;
  sandboxCheckoutUrl: string | null;
  lines: MpCartLine[];
};

export function startStaffMpCartCheckout(
  memberId: string,
  input: {
    items: MpCartItemInput[];
    idempotencyKey?: string;
    discountPercent?: number;
  },
): Promise<MpCartCheckoutResult> {
  return apiRequest<MpCartCheckoutResult>(
    `/members/${memberId}/transaction-items/mp/cart`,
    {
      method: 'POST',
      body: {
        ...input,
        discountPercent:
          input.discountPercent ?? getCajaMpDiscountPercent('link'),
      },
    },
  );
}

export function pickMpCartCheckoutUrl(
  result: Pick<MpCartCheckoutResult, 'checkoutUrl' | 'sandboxCheckoutUrl'>,
): string | null {
  return result.checkoutUrl ?? result.sandboxCheckoutUrl;
}
