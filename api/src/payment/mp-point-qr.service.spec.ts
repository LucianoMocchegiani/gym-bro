import { BadGatewayException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PacksService } from '../packs/packs.service';
import { SessionValidationService } from '../sessions/session-validation.service';
import { HttpMpQrAdapter } from './http-mp-qr.adapter';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { MpPointQrService } from './mp-point-qr.service';
import { WebhookPaymentService } from './webhook-payment.service';

describe('MpPointQrService', () => {
  const makeService = (order: {
    id: string;
    type: string;
    status: string;
    externalReference: string | null;
    totalAmount: string | null;
    totalPaidAmount: string | null;
    qrData: string | null;
    payments: Array<{
      id: string | null;
      status: string;
      amount: string | null;
    }>;
  }) => {
    const prisma = {
      transaction: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'transaction-1',
          amount: 1250,
          transactionItems: [{ id: 'item-1' }],
        }),
      },
      mercadoPagoQrOrder: {
        findFirst: jest.fn().mockResolvedValue({
          mpOrderId: 'ORD-1',
          transactionId: 'transaction-1',
        }),
      },
    } as unknown as PrismaService;
    const accounts = {
      getDecryptedAccessToken: jest.fn().mockResolvedValue('token'),
    } as unknown as MercadoPagoAccountService;
    const adapter = {
      getOrder: jest.fn().mockResolvedValue(order),
    } as unknown as HttpMpQrAdapter;
    const applyMpPaymentToCart = jest.fn().mockResolvedValue({ handled: true });
    const webhook = {
      applyMpPaymentToCart,
    } as unknown as WebhookPaymentService;
    return {
      service: new MpPointQrService(
        prisma,
        accounts,
        adapter,
        {} as PacksService,
        {} as SessionValidationService,
        webhook,
      ),
      applyMpPaymentToCart,
    };
  };

  it('confirms only a processed order with matching amount and approved payment', async () => {
    const { service, applyMpPaymentToCart } = makeService({
      id: 'ORD-1',
      type: 'qr',
      status: 'processed',
      externalReference: 'transaction-1',
      totalAmount: '1250.00',
      totalPaidAmount: '1250.00',
      qrData: 'payload',
      payments: [{ id: 'payment-1', status: 'approved', amount: '1250.00' }],
    });

    await expect(
      service.getOrderStatus('tenant-1', 'transaction-1'),
    ).resolves.toEqual({
      orderId: 'ORD-1',
      status: 'processed',
      approved: true,
    });
    expect(applyMpPaymentToCart).toHaveBeenCalledWith(
      'tenant-1',
      'transaction-1',
      'payment-1',
      'approved',
    );
  });

  it('does not confirm an order with a mismatched paid amount', async () => {
    const { service, applyMpPaymentToCart } = makeService({
      id: 'ORD-1',
      type: 'qr',
      status: 'processed',
      externalReference: 'transaction-1',
      totalAmount: '1250.00',
      totalPaidAmount: '1.00',
      qrData: 'payload',
      payments: [{ id: 'payment-1', status: 'approved', amount: '1.00' }],
    });

    await expect(
      service.getOrderStatus('tenant-1', 'transaction-1'),
    ).rejects.toThrow(BadGatewayException);
    expect(applyMpPaymentToCart).not.toHaveBeenCalled();
  });

  it('defaults QR Point checkout to a 5% discount and stores the list price', async () => {
    const transaction = {
      id: 'transaction-1',
      memberId: 'member-1',
      amount: 95,
      status: 'PENDING',
      idempotencyKey: 'qr-checkout-1',
      transactionItems: [],
    };
    type TransactionCreateArgs = {
      data: {
        amount: number;
        transactionItems: {
          create: Array<{
            amount: number;
            listAmount: number | null;
            discountBps: number;
          }>;
        };
      };
    };
    const transactionCreate = jest
      .fn<Promise<typeof transaction>, [TransactionCreateArgs]>()
      .mockResolvedValue(transaction);
    type PrismaTransaction = { transaction: { create: typeof transactionCreate } };
    const prisma = {
      member: { findFirst: jest.fn().mockResolvedValue({ status: 'ACTIVE' }) },
      pack: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'pack-1',
          active: true,
          price: 100,
          components: [{}],
        }),
      },
      transaction: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest
        .fn()
        .mockImplementation(
          (callback: (tx: PrismaTransaction) => Promise<unknown>) =>
            callback({ transaction: { create: transactionCreate } }),
        ),
      mercadoPagoAccount: {
        findUnique: jest.fn().mockResolvedValue({ mpUserId: 'mp-user' }),
      },
      mercadoPagoQrSetup: {
        findUnique: jest.fn().mockResolvedValue({
          posId: 'pos-1',
          mpUserId: 'mp-user',
        }),
      },
      mercadoPagoQrOrder: {
        create: jest.fn().mockResolvedValue({
          mpOrderId: 'ORD-1',
          qrData: 'qr-payload',
        }),
      },
    } as unknown as PrismaService;
    const createOrder = jest.fn(() =>
      Promise.resolve({ id: 'ORD-1', qrData: 'qr-payload' }),
    );
    const adapter = { createOrder } as unknown as HttpMpQrAdapter;
    const service = new MpPointQrService(
      prisma,
      {
        getDecryptedAccessToken: jest.fn().mockResolvedValue('token'),
      } as unknown as MercadoPagoAccountService,
      adapter,
      {} as PacksService,
      {} as SessionValidationService,
      {} as WebhookPaymentService,
    );

    await expect(
      service.startStaffCart(
        'tenant-1',
        'member-1',
        {
          items: [{ kind: 'PACK', id: 'pack-1' }],
          idempotencyKey: 'qr-checkout-1',
        },
        'staff-1',
      ),
    ).resolves.toMatchObject({ amount: 95 });

    expect(transactionCreate).toHaveBeenCalledTimes(1);
    const [{ data }] = transactionCreate.mock.calls[0];
    expect(data.amount).toBe(95);
    expect(data.transactionItems.create[0]).toMatchObject({
      amount: 95,
      listAmount: 100,
      discountBps: 500,
    });
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 95 }),
    );
  });
});
