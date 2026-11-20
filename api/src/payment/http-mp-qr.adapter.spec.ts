import { HttpMpQrAdapter } from './http-mp-qr.adapter';

describe('HttpMpQrAdapter', () => {
  afterEach(() => jest.restoreAllMocks());

  it('finds a previously created store by its stable external ID', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ results: [{ id: 42, external_id: 'gbtenant' }] }),
        ),
      );

    await expect(
      new HttpMpQrAdapter().findStoreByExternalId(
        'token',
        'seller-1',
        'gbtenant',
      ),
    ).resolves.toBe('42');
    const [url] = fetchMock.mock.calls[0];
    expect(url).toEqual(
      new URL(
        'https://api.mercadopago.com/users/seller-1/stores/search?external_id=gbtenant',
      ),
    );
  });

  it('creates a POS with the idempotency key and QR point-of-sale mode', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ id: 123 })));

    await expect(
      new HttpMpQrAdapter().createPos({
        accessToken: 'token',
        storeId: 'store-1',
        externalId: 'pos-ext',
        idempotencyKey: 'idem-1',
      }),
    ).resolves.toBe('123');

    const [, options] = fetchMock.mock.calls[0];
    expect(options?.headers).toEqual({
      Authorization: 'Bearer token',
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Idempotency-Key': 'idem-1',
    });
    expect(options?.body).toBe(
      JSON.stringify({
        name: 'Caja Faciliter',
        store_id: 'store-1',
        external_id: 'pos-ext',
        config: { qr: { operating_mode: 'pdv' } },
      }),
    );
  });
});
