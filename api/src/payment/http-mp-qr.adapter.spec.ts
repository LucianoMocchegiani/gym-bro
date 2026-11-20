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
    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        'https://api.mercadopago.com/users/seller-1/stores/search?external_id=gbtenant',
      ),
      expect.anything(),
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

    expect(fetchMock).toHaveBeenCalledWith('https://api.mercadopago.com/v2/pos', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Idempotency-Key': 'idem-1',
      },
      body: JSON.stringify({
        name: 'Caja Faciliter',
        store_id: 'store-1',
        external_id: 'pos-ext',
        config: { qr: { operating_mode: 'pdv' } },
      }),
    });
  });

  it('creates a dynamic QR order for the configured POS', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'ORD-1',
          type: 'qr',
          status: 'created',
          external_reference: 'transaction-1',
          config: { qr: { qr_data: 'qr-payload' } },
        }),
      ),
    );

    await expect(
      new HttpMpQrAdapter().createOrder({
        accessToken: 'token',
        externalPosId: 'pos-external',
        externalReference: 'transaction-1',
        amount: 1250,
        idempotencyKey: 'transaction-1',
      }),
    ).resolves.toMatchObject({ id: 'ORD-1', qrData: 'qr-payload' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.mercadopago.com/v1/orders',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Idempotency-Key': 'transaction-1',
        },
        body: JSON.stringify({
          type: 'qr',
          total_amount: '1250.00',
          external_reference: 'transaction-1',
          description: 'Cobro Faciliter',
          config: { qr: { external_pos_id: 'pos-external', mode: 'dynamic' } },
          transactions: { payments: [{ amount: '1250.00' }] },
        }),
      },
    );
  });

  it('reads the authoritative order status and payment data', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'ORD-1',
          type: 'qr',
          status: 'processed',
          external_reference: 'transaction-1',
          total_amount: '1250.00',
          total_paid_amount: '1250.00',
          transactions: {
            payments: [{ id: 99, status: 'approved', amount: '1250.00' }],
          },
        }),
      ),
    );

    await expect(
      new HttpMpQrAdapter().getOrder('token', 'ORD-1'),
    ).resolves.toMatchObject({
      id: 'ORD-1',
      status: 'processed',
      totalPaidAmount: '1250.00',
      payments: [{ id: '99', status: 'approved', amount: '1250.00' }],
    });
  });
});
