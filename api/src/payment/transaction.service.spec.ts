import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { TransactionService } from './transaction.service';

describe('TransactionService product checkout validation', () => {
  it('rejects a client-supplied product price that differs from the catalog', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ price: 1000, active: true }]),
      transaction: { create: jest.fn() },
    };
    const service = new TransactionService(prisma as never);

    await expect(service.initiateTransaction({
      tenantId: 'tenant', memberId: 'member', method: PaymentMethod.CASH,
      items: [{ productId: 'product', amount: 500, idempotencyKey: 'item-key' }],
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });
});
