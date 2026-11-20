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

@Injectable()
export class HttpMpQrAdapter {
  private readonly logger = new Logger(HttpMpQrAdapter.name);

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

  private async readId(response: Response, operation: string): Promise<string> {
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(
        `MP QR ${operation} failed status=${response.status} body=${body.slice(0, 300)}`,
      );
      throw new Error(`Mercado Pago QR ${operation} failed (HTTP ${response.status})`);
    }
    const data = (await response.json()) as { id?: number | string };
    if (data.id === undefined || data.id === null || String(data.id) === '') {
      throw new Error(`Mercado Pago QR ${operation} response missing id`);
    }
    return String(data.id);
  }
}
