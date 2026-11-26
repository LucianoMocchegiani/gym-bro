import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { TransactionService } from './transaction.service';

describe('TransactionService product checkout validation', () => {
  it('rejects a client-supplied product price that differs from the catalog', async () => {
    const productQuery = jest
      .fn<Promise<{ price: number; active: boolean }[]>, []>()
      .mockResolvedValue([{ price: 1000, active: true }]);
    const transactionCreate = jest.fn();
    const prisma = {
      $transaction: jest.fn(
        (
          callback: (client: {
            $queryRaw: typeof productQuery;
            transaction: { create: typeof transactionCreate };
          }) => unknown,
        ) =>
          callback({
            $queryRaw: productQuery,
            transaction: { create: transactionCreate },
          }),
      ),
    };
    const service = new TransactionService(prisma as never);

    await expect(
      service.initiateTransaction({
        tenantId: 'tenant',
        memberId: 'member',
        method: PaymentMethod.CASH,
        items: [
          { productId: 'product', amount: 500, idempotencyKey: 'item-key' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transactionCreate).not.toHaveBeenCalled();
  });
});
