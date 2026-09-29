import { Injectable, Logger } from '@nestjs/common';
import {
  CreateMpCardPaymentInput,
  CreateMpPreapprovalInput,
  CreateMpPreapprovalPlanInput,
  CreateMpPreferenceInput,
  MpAccountPort,
  MpAccountValidation,
  MpCardPaymentResult,
  MpCustomer,
  MpPreapprovalResult,
  MpPreferenceResult,
  MpRemoteAuthorizedPayment,
  MpRemoteMerchantOrder,
  MpRemotePayment,
  MpRemotePreapproval,
  MpSavedCard,
} from './mp-account.port';

const MP_USERS_ME = 'https://api.mercadopago.com/users/me';
const MP_PREFERENCES = 'https://api.mercadopago.com/checkout/preferences';
const MP_PAYMENTS = 'https://api.mercadopago.com/v1/payments';
const MP_CUSTOMERS = 'https://api.mercadopago.com/v1/customers';
const MP_CARD_TOKENS = 'https://api.mercadopago.com/v1/card_tokens';
const MP_PREAPPROVAL_PLANS = 'https://api.mercadopago.com/preapproval_plan';
const MP_PREAPPROVALS = 'https://api.mercadopago.com/preapproval';
const MP_AUTHORIZED_PAYMENTS =
  'https://api.mercadopago.com/authorized_payments';

/**
 * Adapter HTTP Mercado Pago (cuenta + Preference + pago).
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
  async findOrCreateCustomer(
    accessToken: string,
    email: string,
  ): Promise<MpCustomer> {
    const search = await fetch(
      `${MP_CUSTOMERS}/search?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    );
    if (search.ok) {
      const data = (await search.json()) as {
        results?: Array<{ id?: string; email?: string }>;
      };
      const found = data.results?.[0];
      if (found?.id) {
        return { id: found.id, email: found.email ?? email };
      }
    } else {
      const body = await search.text().catch(() => '');
      this.throwMpFailure('customer search', search.status, body);
    }

    const created = await fetch(MP_CUSTOMERS, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    if (!created.ok) {
      const body = await created.text().catch(() => '');
      this.throwMpFailure('customer create', created.status, body);
    }
    const data = (await created.json()) as { id?: string; email?: string };
    if (!data.id) {
      throw new Error('Mercado Pago customer response missing id');
    }
    return { id: data.id, email: data.email ?? email };
  }

  /**
   * @inheritdoc
   */
  async saveCard(
    accessToken: string,
    customerId: string,
    cardToken: string,
  ): Promise<MpSavedCard> {
    const response = await fetch(
      `${MP_CUSTOMERS}/${encodeURIComponent(customerId)}/cards`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ token: cardToken }),
      },
    );
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(
        `MP save card failed status=${response.status} body=${body.slice(0, 300)}`,
      );
      throw new Error(
        `Mercado Pago save card failed (HTTP ${response.status})`,
      );
    }
    return this.parseSavedCard(await response.json());
  }

  /**
   * @inheritdoc
   */
  async createCardTokenFromSavedCard(
    accessToken: string,
    customerId: string,
    cardId: string,
  ): Promise<string> {
    const response = await fetch(MP_CARD_TOKENS, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ customer_id: customerId, card_id: cardId }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(
        `MP card token failed status=${response.status} body=${body.slice(0, 300)}`,
      );
      throw new Error(
        `Mercado Pago card token failed (HTTP ${response.status})`,
      );
    }
    const data = (await response.json()) as { id?: string };
    if (!data.id) {
      throw new Error('Mercado Pago card token response missing id');
    }
    return data.id;
  }

  /**
   * @inheritdoc
   */
  async createCardPayment(
    input: CreateMpCardPaymentInput,
  ): Promise<MpCardPaymentResult> {
    const payer: Record<string, unknown> = {
      email: input.payerEmail,
    };
    if (input.customerId) {
      payer.type = 'customer';
      payer.id = input.customerId;
    }
    if (input.identificationType && input.identificationNumber) {
      payer.identification = {
        type: input.identificationType,
        number: input.identificationNumber,
      };
    }

    const response = await fetch(MP_PAYMENTS, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: input.amount,
        token: input.token,
        description: input.description,
        installments: input.installments,
        payment_method_id: input.paymentMethodId,
        ...(input.issuerId ? { issuer_id: input.issuerId } : {}),
        binary_mode: true,
        external_reference: input.externalReference,
        notification_url: input.notificationUrl,
        payer,
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(
        `MP card payment failed status=${response.status} body=${body.slice(0, 400)}`,
      );
      throw new Error(`Mercado Pago payment failed (HTTP ${response.status})`);
    }
    const data = (await response.json()) as {
      id?: number | string;
      status?: string;
      status_detail?: string;
      payment_method_id?: string;
      card?: { id?: string | number; last_four_digits?: string };
    };
    if (data.id === undefined || data.id === null || !data.status) {
      throw new Error('Mercado Pago payment response missing id/status');
    }
    return {
      id: String(data.id),
      status: data.status,
      cardId:
        data.card?.id !== undefined && data.card?.id !== null
          ? String(data.card.id)
          : null,
      lastFour: data.card?.last_four_digits ?? null,
      paymentMethodId: data.payment_method_id ?? null,
      statusDetail: data.status_detail ?? null,
    };
  }

  /**
   * @inheritdoc
   */
  async createPreapprovalPlan(
    input: CreateMpPreapprovalPlanInput,
  ): Promise<{ id: string }> {
    const response = await fetch(MP_PREAPPROVAL_PLANS, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        reason: input.reason,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: input.amount,
          currency_id: 'ARS',
        },
        back_url: input.backUrl,
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.throwMpFailure('preapproval_plan', response.status, body);
    }
    const data = (await response.json()) as { id?: string };
    if (!data.id) {
      throw new Error('Mercado Pago preapproval_plan missing id');
    }
    return { id: data.id };
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
        preapproval_plan_id: input.planId,
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

  private parseSavedCard(raw: unknown): MpSavedCard {
    const data = raw as {
      id?: string | number;
      last_four_digits?: string;
      payment_method?: { id?: string };
      payment_method_id?: string;
    };
    if (data.id === undefined || data.id === null) {
      throw new Error('Mercado Pago card response missing id');
    }
    return {
      id: String(data.id),
      lastFour: data.last_four_digits ?? null,
      paymentMethodId:
        data.payment_method?.id ?? data.payment_method_id ?? null,
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
