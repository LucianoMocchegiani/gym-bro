import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { HttpMpQrAdapter } from './http-mp-qr.adapter';
import { MpPointQrOrderDiagnosticService } from './mp-point-qr-order-diagnostic.service';

describe('MpPointQrOrderDiagnosticService', () => {
  const makeService = (overrides: { id?: string; type?: string; externalReference?: string } = {}) => {
    const prisma = {
      transaction: {
        findFirst: jest.fn().mockResolvedValue({ id: 'transaction-1' }),
      },
    } as unknown as PrismaService;
    const accounts = {
      getDecryptedAccessToken: jest.fn().mockResolvedValue('secret-token'),
    } as unknown as MercadoPagoAccountService;
    const mpQr = {
      getOrderDiagnostic: jest.fn().mockResolvedValue({
        id: overrides.id ?? 'order-1',
        type: overrides.type ?? 'qr',
        externalReference: overrides.externalReference ?? 'transaction-1',
        status: 'created',
        mode: 'dynamic',
        totalAmount: '1250.00',
        totalPaidAmount: '0.00',
        payments: [{ status: 'pending', amount: '1250.00' }],
      }),
    } as unknown as HttpMpQrAdapter;
    return {
      service: new MpPointQrOrderDiagnosticService(prisma, accounts, mpQr),
      prisma,
      mpQr,
    };
  };

  it('returns safe status fields only for the matching transaction', async () => {
    const { service, mpQr } = makeService();

    await expect(
      service.getOrderDiagnostic('tenant-1', 'transaction-1', 'order-1'),
    ).resolves.toEqual({
      orderId: 'order-1',
      status: 'created',
      mode: 'dynamic',
      totalAmount: '1250.00',
      totalPaidAmount: '0.00',
      payments: [{ status: 'pending', amount: '1250.00' }],
    });
    expect(mpQr.getOrderDiagnostic).toHaveBeenCalledWith(
      'secret-token',
      'order-1',
    );
  });

  it('rejects an order not linked to the transaction', async () => {
    const { service } = makeService({ externalReference: 'other-transaction' });

    await expect(
      service.getOrderDiagnostic('tenant-1', 'transaction-1', 'order-1'),
    ).rejects.toThrow(BadGatewayException);
  });

  it('returns not found for a transaction outside the tenant', async () => {
    const { service, prisma } = makeService();
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.getOrderDiagnostic('tenant-1', 'transaction-1', 'order-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
