import { Injectable, Logger } from '@nestjs/common';
import {
  CreateMpPreferenceInput,
  MpAccountPort,
  MpAccountValidation,
  MpPreferenceResult,
  MpRemoteMerchantOrder,
  MpRemotePayment,
} from './mp-account.port';

const MP_USERS_ME = 'https://api.mercadopago.com/users/me';
const MP_PREFERENCES = 'https://api.mercadopago.com/checkout/preferences';
const MP_PAYMENTS = 'https://api.mercadopago.com/v1/payments';

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
}
