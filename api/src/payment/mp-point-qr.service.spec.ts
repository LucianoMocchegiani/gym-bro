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
    const webhook = {
      applyMpPaymentToCart: jest.fn().mockResolvedValue({ handled: true }),
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
      webhook,
    };
  };

  it('confirms only a processed order with matching amount and approved payment', async () => {
    const { service, webhook } = makeService({
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
    expect(webhook.applyMpPaymentToCart).toHaveBeenCalledWith(
      'tenant-1',
      'transaction-1',
      'payment-1',
      'approved',
    );
  });

  it('does not confirm an order with a mismatched paid amount', async () => {
    const { service, webhook } = makeService({
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
    expect(webhook.applyMpPaymentToCart).not.toHaveBeenCalled();
  });
});
