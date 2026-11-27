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

  it('reserves Point QR product stock and applies the default discount', async () => {
    const transaction = {
      id: 'transaction-1',
      memberId: 'member-1',
      amount: 95,
      status: 'PENDING',
      idempotencyKey: 'qr-checkout-product-1',
      transactionItems: [{ id: 'transaction-item-1' }],
    };
    type TransactionCreateArgs = { data: { amount: number } };
    type TransactionItemCreateArgs = {
      data: {
        packId: string | null;
        sessionId: string | null;
        amount: number;
        listAmount: number;
        discountBps: number;
      };
    };
    const transactionCreate = jest
      .fn<Promise<typeof transaction>, [TransactionCreateArgs]>()
      .mockResolvedValue(transaction);
    const transactionItemCreate = jest
      .fn<Promise<{ id: string }>, [TransactionItemCreateArgs]>()
      .mockResolvedValue({ id: 'transaction-item-1' });
    type PrismaTransaction = {
      transaction: {
        create: typeof transactionCreate;
        findUniqueOrThrow: jest.Mock;
      };
      transactionItem: { create: typeof transactionItemCreate };
      $queryRaw: jest.Mock;
      $executeRaw: jest.Mock;
    };
    const tx: PrismaTransaction = {
      transaction: {
        create: transactionCreate,
        findUniqueOrThrow: jest.fn().mockResolvedValue(transaction),
      },
      transactionItem: { create: transactionItemCreate },
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([
          {
            id: 'product-1',
            name: 'Botella',
            description: null,
            price: 100,
            active: true,
          },
        ])
        .mockResolvedValueOnce([
          { stock_quantity: 5, active: true, name: 'Botella' },
        ]),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    const prisma = {
      member: { findFirst: jest.fn().mockResolvedValue({ status: 'ACTIVE' }) },
      transaction: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest
        .fn()
        .mockImplementation(
          (callback: (client: PrismaTransaction) => unknown) => callback(tx),
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
    const service = new MpPointQrService(
      prisma,
      {
        getDecryptedAccessToken: jest.fn().mockResolvedValue('token'),
      } as unknown as MercadoPagoAccountService,
      { createOrder } as unknown as HttpMpQrAdapter,
      {} as PacksService,
      {} as SessionValidationService,
      {} as WebhookPaymentService,
    );

    await expect(
      service.startStaffCart(
        'tenant-1',
        'member-1',
        {
          items: [{ kind: 'PRODUCT', id: 'product-1', quantity: 1 }],
          idempotencyKey: 'qr-checkout-product-1',
        },
        'staff-1',
      ),
    ).resolves.toMatchObject({ amount: 95 });

    expect(transactionCreate.mock.calls[0]?.[0].data.amount).toBe(95);
    expect(transactionItemCreate.mock.calls[0]?.[0].data).toMatchObject({
      packId: null,
      sessionId: null,
      amount: 95,
      listAmount: 100,
      discountBps: 500,
    });
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 95 }),
    );
  });
});
