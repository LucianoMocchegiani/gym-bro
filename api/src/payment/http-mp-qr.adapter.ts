import { Injectable, Logger } from '@nestjs/common';

export type CreateMpQrStoreInput = {
  accessToken: string;
  userId: string;
  name: string;
  externalId: string;
  streetName: string;
  streetNumber: string;
  cityName: string;
  stateName: string;
  latitude: number;
  longitude: number;
};

export type CreateMpQrPosInput = {
  accessToken: string;
  storeId: string;
  externalId: string;
  idempotencyKey: string;
};

export type CreateMpQrOrderInput = {
  accessToken: string;
  externalPosId: string;
  externalReference: string;
  amount: number;
  idempotencyKey: string;
};

export type MpQrOrder = {
  id: string;
  type: string;
  status: string;
  externalReference: string | null;
  totalAmount: string | null;
  totalPaidAmount: string | null;
  qrData: string | null;
  payments: Array<{ id: string | null; status: string; amount: string | null }>;
};

@Injectable()
export class HttpMpQrAdapter {
  private readonly logger = new Logger(HttpMpQrAdapter.name);

  async findStoreByExternalId(
    accessToken: string,
    userId: string,
    externalId: string,
  ): Promise<string | null> {
    const url = new URL(
      `https://api.mercadopago.com/users/${encodeURIComponent(userId)}/stores/search`,
    );
    url.searchParams.set('external_id', externalId);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
    if (response.status === 404) {
      const error = (await response
        .clone()
        .json()
        .catch(() => null)) as {
        error?: string;
      } | null;
      if (error?.error === 'store_not_found') return null;
    }
    await this.assertOk(response, 'store search');
    const data = (await response.json()) as {
      results?: Array<{ id?: number | string; external_id?: string }>;
    };
    const store = data.results?.find(
      (result) =>
        result.external_id === externalId &&
        result.id !== undefined &&
        result.id !== null,
    );
    return store ? String(store.id) : null;
  }

  async createStore(input: CreateMpQrStoreInput): Promise<string> {
    const response = await fetch(
      `https://api.mercadopago.com/users/${encodeURIComponent(input.userId)}/stores`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: input.name,
          external_id: input.externalId,
          location: {
            street_name: input.streetName,
            street_number: input.streetNumber,
            city_name: input.cityName,
            state_name: input.stateName,
            latitude: input.latitude,
            longitude: input.longitude,
          },
        }),
      },
    );
    return this.readId(response, 'store');
  }

  async createPos(input: CreateMpQrPosInput): Promise<string> {
    const response = await fetch('https://api.mercadopago.com/v2/pos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify({
        name: 'Caja Faciliter',
        store_id: input.storeId,
        external_id: input.externalId,
        config: { qr: { operating_mode: 'pdv' } },
      }),
    });
    return this.readId(response, 'POS');
  }

  async createOrder(input: CreateMpQrOrderInput): Promise<MpQrOrder> {
    const amount = input.amount.toFixed(2);
    const response = await fetch('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify({
        type: 'qr',
        total_amount: amount,
        external_reference: input.externalReference,
        description: 'Cobro Faciliter',
        config: {
          qr: { external_pos_id: input.externalPosId, mode: 'dynamic' },
        },
        transactions: { payments: [{ amount }] },
      }),
    });
    return this.readOrder(response);
  }

  async getOrder(accessToken: string, orderId: string): Promise<MpQrOrder> {
    const response = await fetch(
      `https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    );
    return this.readOrder(response);
  }

  private async readOrder(response: Response): Promise<MpQrOrder> {
    await this.assertOk(response, 'order');
    const data = (await response.json()) as {
      id?: string;
      type?: string;
      status?: string;
      external_reference?: string;
      total_amount?: string | number;
      total_paid_amount?: string | number;
      config?: { qr?: { qr_data?: string } };
      transactions?: {
        payments?: Array<{
          id?: string | number;
          status?: string;
          amount?: string | number;
        }>;
      };
    };
    if (!data.id || !data.status || !data.type) {
      throw new Error('Mercado Pago QR order response missing id/type/status');
    }
    const qrData = data.config?.qr?.qr_data ?? null;
    if (!qrData) {
      const responseFields = Object.keys(data).join(',');
      const configFields = Object.keys(data.config ?? {}).join(',');
      const qrFields = Object.keys(data.config?.qr ?? {}).join(',');
      throw new Error(
        [
          'Mercado Pago QR order response missing QR data',
          `id=${data.id}`,
          `fields=${responseFields}`,
          `configFields=${configFields}`,
          `qrFields=${qrFields}`,
        ].join('; '),
      );
    }
    return {
      id: data.id,
      type: data.type,
      status: data.status,
      externalReference: data.external_reference ?? null,
      totalAmount:
        data.total_amount === undefined ? null : String(data.total_amount),
      totalPaidAmount:
        data.total_paid_amount === undefined
          ? null
          : String(data.total_paid_amount),
      qrData,
      payments: (data.transactions?.payments ?? []).map((payment) => ({
        id:
          payment.id === undefined || payment.id === null
            ? null
            : String(payment.id),
        status: payment.status ?? 'unknown',
        amount: payment.amount === undefined ? null : String(payment.amount),
      })),
    };
  }

  private async readId(response: Response, operation: string): Promise<string> {
    await this.assertOk(response, operation);
    const data = (await response.json()) as { id?: number | string };
    if (data.id === undefined || data.id === null || String(data.id) === '') {
      throw new Error(`Mercado Pago QR ${operation} response missing id`);
    }
    return String(data.id);
  }

  private async assertOk(response: Response, operation: string): Promise<void> {
    if (response.ok) {
      return;
    }
    const body = await response.text().catch(() => '');
    let logDetail = body.slice(0, 300);
    if (operation === 'store') {
      try {
        const error = JSON.parse(body) as {
          causes?: Array<{ description?: string }>;
        };
        const cityNameError = error.causes?.find((cause) =>
          cause.description?.startsWith('location.city_name was invalid.'),
        )?.description;
        if (cityNameError) logDetail = cityNameError;
      } catch {
        // Keep the existing truncated log for non-JSON error bodies.
      }
    }
    this.logger.warn(
      `MP QR ${operation} failed status=${response.status} body=${logDetail}`,
    );
    throw new Error(
      `Mercado Pago QR ${operation} failed (HTTP ${response.status})`,
    );
  }
}
