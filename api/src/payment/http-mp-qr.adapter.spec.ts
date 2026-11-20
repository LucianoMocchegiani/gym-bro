import { HttpMpQrAdapter } from './http-mp-qr.adapter';

describe('HttpMpQrAdapter', () => {
  afterEach(() => jest.restoreAllMocks());

  it('finds a previously created store by its stable external ID', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ id: 42, external_id: 'gbtenant' }] }),
    } as Response);

    await expect(
      new HttpMpQrAdapter().findStoreByExternalId('token', 'seller-1', 'gbtenant'),
    ).resolves.toBe('42');
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      'https://api.mercadopago.com/users/seller-1/stores/search?external_id=gbtenant',
    );
  });

  it('creates a POS with the idempotency key and QR point-of-sale mode', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ id: 123 }),
    } as Response);

    await expect(
      new HttpMpQrAdapter().createPos({
        accessToken: 'token',
        storeId: 'store-1',
        externalId: 'pos-ext',
        idempotencyKey: 'idem-1',
      }),
    ).resolves.toBe('123');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.mercadopago.com/v2/pos',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Idempotency-Key': 'idem-1' }),
        body: JSON.stringify({
          name: 'Caja Faciliter',
          store_id: 'store-1',
          external_id: 'pos-ext',
          config: { qr: { operating_mode: 'pdv' } },
        }),
      }),
    );
  });
});
