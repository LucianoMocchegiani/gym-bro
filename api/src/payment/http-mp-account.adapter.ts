import { Injectable, Logger } from '@nestjs/common';
import {
  CreateMpPreapprovalInput,
  CreateMpPreferenceInput,
  ExchangeMpOAuthCodeInput,
  MpAccountPort,
  MpAccountValidation,
  MpOAuthTokens,
  MpPreapprovalResult,
  MpPreferenceResult,
  MpRemoteAuthorizedPayment,
  MpRemoteMerchantOrder,
  MpRemotePayment,
  MpRemotePreapproval,
  RefreshMpOAuthTokenInput,
} from './mp-account.port';

const MP_USERS_ME = 'https://api.mercadopago.com/users/me';
const MP_PREFERENCES = 'https://api.mercadopago.com/checkout/preferences';
const MP_PAYMENTS = 'https://api.mercadopago.com/v1/payments';
const MP_PREAPPROVALS = 'https://api.mercadopago.com/preapproval';
const MP_AUTHORIZED_PAYMENTS =
  'https://api.mercadopago.com/authorized_payments';
const MP_OAUTH_TOKEN = 'https://api.mercadopago.com/oauth/token';

/**
 * Adapter HTTP Mercado Pago (cuenta, Preference, suscripciones, pagos).
 */
@Injectable()
export class HttpMpAccountAdapter extends MpAccountPort {
  private readonly logger = new Logger(HttpMpAccountAdapter.name);

  /**
   * @inheritdoc
   */
  async validateAccessToken(accessToken: string): Promise<MpAccountValidation> {
    const response = await fetch(MP_USERS_ME, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(
        `MP /users/me failed status=${response.status} body=${body.slice(0, 200)}`,
      );
      throw new Error(
        `Mercado Pago rejected credentials (HTTP ${response.status})`,
      );
    }

    const data = (await response.json()) as {
      id?: number | string;
      nickname?: string;
    };
    if (data.id === undefined || data.id === null) {
      throw new Error('Mercado Pago /users/me response missing id');
    }

    return {
      userId: String(data.id),
      nickname: data.nickname,
    };
  }

  /**
   * @inheritdoc
   */
  async createPreference(
    input: CreateMpPreferenceInput,
  ): Promise<MpPreferenceResult> {
    const response = await fetch(MP_PREFERENCES, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        items: input.items.map((item) => ({
          title: item.title,
          ...(item.description ? { description: item.description } : {}),
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency_id: 'ARS',
        })),
        external_reference: input.externalReference,
        notification_url: input.notificationUrl,
        payer: input.payerEmail ? { email: input.payerEmail } : undefined,
        metadata: {
          gymbro_external_reference: input.externalReference,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(
        `MP preferences failed status=${response.status} body=${body.slice(0, 300)}`,
      );
      throw new Error(
        `Mercado Pago preference failed (HTTP ${response.status})`,
      );
    }

    const data = (await response.json()) as {
      id?: string;
      init_point?: string;
      sandbox_init_point?: string;
    };
    if (!data.id || !data.init_point) {
      throw new Error('Mercado Pago preference response missing id/init_point');
    }

    return {
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point ?? null,
    };
  }

  /**
   * @inheritdoc
   */
  async getPayment(
    accessToken: string,
    mpPaymentId: string,
  ): Promise<MpRemotePayment> {
    const response = await fetch(
      `${MP_PAYMENTS}/${encodeURIComponent(mpPaymentId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(
        `MP payment ${mpPaymentId} failed status=${response.status} body=${body.slice(0, 200)}`,
      );
      throw new Error(
        `Mercado Pago payment fetch failed (HTTP ${response.status})`,
      );
    }

    const data = (await response.json()) as {
      id?: number | string;
      status?: string;
      external_reference?: string;
      preference_id?: string;
      transaction_amount?: number;
    };
    if (data.id === undefined || data.id === null || !data.status) {
      throw new Error('Mercado Pago payment response missing id/status');
    }

    return {
      id: String(data.id),
      status: data.status,
      externalReference: data.external_reference ?? null,
      preferenceId: data.preference_id ?? null,
      transactionAmount:
        typeof data.transaction_amount === 'number'
          ? data.transaction_amount
          : null,
    };
  }

  /**
   * @inheritdoc
   */
  async getMerchantOrder(
    accessToken: string,
    merchantOrderId: string,
  ): Promise<MpRemoteMerchantOrder> {
    const response = await fetch(
      `https://api.mercadopago.com/merchant_orders/${encodeURIComponent(merchantOrderId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(
        `MP merchant_order ${merchantOrderId} failed status=${response.status} body=${body.slice(0, 200)}`,
      );
      throw new Error(
        `Mercado Pago merchant_order fetch failed (HTTP ${response.status})`,
      );
    }

    const data = (await response.json()) as {
      id?: number | string;
      status?: string;
      external_reference?: string;
      payments?: Array<{
        id?: number | string;
        status?: string;
        transaction_amount?: number;
      }>;
    };

    return {
      id: String(data.id ?? merchantOrderId),
      status: data.status ?? 'unknown',
      externalReference: data.external_reference ?? null,
      payments: (data.payments ?? []).map((p) => ({
        id: String(p.id ?? ''),
        status: p.status ?? 'unknown',
        transactionAmount:
          typeof p.transaction_amount === 'number'
            ? p.transaction_amount
            : null,
      })),
    };
  }

  /**
   * @inheritdoc
   */
  async refundPayment(
    accessToken: string,
    mpPaymentId: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<{ ok: boolean; manualPending: boolean }> {
    const response = await fetch(
      `${MP_PAYMENTS}/${encodeURIComponent(mpPaymentId)}/refunds`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ amount }),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(
        `MP refund ${mpPaymentId} failed status=${response.status} body=${body.slice(0, 300)}`,
      );
      return { ok: false, manualPending: true };
    }

    return { ok: true, manualPending: false };
  }

  /**
   * @inheritdoc
   */
  async createPreapproval(
    input: CreateMpPreapprovalInput,
  ): Promise<MpPreapprovalResult> {
    const autoRecurring: Record<string, unknown> = {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: input.amount,
      currency_id: 'ARS',
    };
    if (input.startDate) {
      autoRecurring.start_date = input.startDate;
    }
    const response = await fetch(MP_PREAPPROVALS, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        reason: input.reason,
        external_reference: input.externalReference,
        payer_email: input.payerEmail,
        back_url: input.backUrl,
        status: 'pending',
        notification_url: input.notificationUrl,
        auto_recurring: autoRecurring,
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.throwMpFailure('preapproval', response.status, body);
    }
    const data = (await response.json()) as {
      id?: string;
      init_point?: string;
      status?: string;
    };
    if (!data.id || !data.init_point) {
      throw new Error('Mercado Pago preapproval missing id/init_point');
    }
    return {
      id: data.id,
      initPoint: data.init_point,
      status: data.status ?? 'pending',
    };
  }

  /**
   * @inheritdoc
   */
  async getPreapproval(
    accessToken: string,
    preapprovalId: string,
  ): Promise<MpRemotePreapproval> {
    const response = await fetch(
      `${MP_PREAPPROVALS}/${encodeURIComponent(preapprovalId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    );
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.throwMpFailure('get preapproval', response.status, body);
    }
    const data = (await response.json()) as {
      id?: string;
      status?: string;
      external_reference?: string;
    };
    if (!data.id || !data.status) {
      throw new Error('Mercado Pago preapproval missing id/status');
    }
    return {
      id: data.id,
      status: data.status,
      externalReference: data.external_reference ?? null,
    };
  }

  /**
   * @inheritdoc
   */
  async cancelPreapproval(
    accessToken: string,
    preapprovalId: string,
  ): Promise<void> {
    const response = await fetch(
      `${MP_PREAPPROVALS}/${encodeURIComponent(preapprovalId)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      },
    );
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.throwMpFailure('cancel preapproval', response.status, body);
    }
  }

  /**
   * @inheritdoc
   */
  async getAuthorizedPayment(
    accessToken: string,
    authorizedPaymentId: string,
  ): Promise<MpRemoteAuthorizedPayment> {
    const response = await fetch(
      `${MP_AUTHORIZED_PAYMENTS}/${encodeURIComponent(authorizedPaymentId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    );
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.throwMpFailure('get authorized_payment', response.status, body);
    }
    const data = (await response.json()) as {
      id?: string | number;
      status?: string;
      preapproval_id?: string;
      external_reference?: string;
      payment?: { id?: string | number };
    };
    if (data.id === undefined || data.id === null || !data.status) {
      throw new Error('Mercado Pago authorized_payment missing id/status');
    }
    return {
      id: String(data.id),
      status: data.status,
      preapprovalId: data.preapproval_id ?? null,
      externalReference: data.external_reference ?? null,
      paymentId:
        data.payment?.id !== undefined && data.payment?.id !== null
          ? String(data.payment.id)
          : null,
    };
  }

  /**
   * @inheritdoc
   */
  async hasApprovedAuthorizedPayment(
    accessToken: string,
    preapprovalId: string,
  ): Promise<boolean> {
    const response = await fetch(
      `${MP_AUTHORIZED_PAYMENTS}/search?preapproval_id=${encodeURIComponent(preapprovalId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    );
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.throwMpFailure('search authorized_payments', response.status, body);
    }
    const data = (await response.json()) as {
      results?: Array<{ status?: string; payment?: { status?: string } }>;
    };
    return (data.results ?? []).some((row) =>
      row.payment?.status
        ? row.payment.status === 'approved'
        : row.status === 'approved' || row.status === 'processed',
    );
  }

  /**
   * @inheritdoc
   */
  exchangeOAuthCode(input: ExchangeMpOAuthCodeInput): Promise<MpOAuthTokens> {
    return this.requestOAuthToken('oauth code', {
      client_id: input.clientId,
      client_secret: input.clientSecret,
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: input.redirectUri,
      ...(input.codeVerifier ? { code_verifier: input.codeVerifier } : {}),
    });
  }

  /**
   * @inheritdoc
   */
  refreshOAuthToken(input: RefreshMpOAuthTokenInput): Promise<MpOAuthTokens> {
    return this.requestOAuthToken('oauth refresh', {
      client_id: input.clientId,
      client_secret: input.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: input.refreshToken,
    });
  }

  private async requestOAuthToken(
    operation: string,
    body: Record<string, string>,
  ): Promise<MpOAuthTokens> {
    const response = await fetch(MP_OAUTH_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams(body).toString(),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.throwMpFailure(operation, response.status, text);
    }
    const data = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      public_key?: string;
      user_id?: number | string;
      expires_in?: number;
    };
    if (
      !data.access_token ||
      !data.refresh_token ||
      !data.public_key ||
      data.user_id === undefined ||
      data.user_id === null
    ) {
      throw new Error(`Mercado Pago ${operation} response incomplete`);
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      publicKey: data.public_key,
      userId: String(data.user_id),
      expiresIn:
        typeof data.expires_in === 'number' ? data.expires_in : 15_552_000,
    };
  }

  /**
   * Falla una llamada MP con el detalle de `cause` (sin secretos).
   */
  private throwMpFailure(
    operation: string,
    status: number,
    body: string,
  ): never {
    this.logger.warn(
      `MP ${operation} failed status=${status} body=${body.slice(0, 300)}`,
    );
    const detail = this.mpErrorDetail(body);
    throw new Error(
      detail
        ? `Mercado Pago ${operation} failed (HTTP ${status}): ${detail}`
        : `Mercado Pago ${operation} failed (HTTP ${status})`,
    );
  }

  private mpErrorDetail(body: string): string | null {
    try {
      const parsed = JSON.parse(body) as {
        message?: string;
        cause?: Array<{ description?: string }>;
      };
      const cause = parsed.cause?.[0]?.description?.trim();
      if (cause) {
        return cause;
      }
      return parsed.message?.trim() || null;
    } catch {
      return null;
    }
  }
}
