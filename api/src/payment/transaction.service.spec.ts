import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { reserveProductSale } from '../products/product-sales';
import { TransactionService } from './transaction.service';

jest.mock('../products/product-sales', () => ({
  reserveProductSale: jest.fn(),
}));

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

  it.each(
    [
      [PaymentMethod.CASH, false],
      [PaymentMethod.MP, true],
    ] as const,
  )(
    'creates a product sale and reserves stock for %s',
    async (method, pending) => {
      const productQuery = jest
        .fn<Promise<{ price: number; active: boolean }[]>, []>()
        .mockResolvedValue([{ price: 1000, active: true }]);
      const transactionCreate = jest
        .fn()
        .mockResolvedValue({ id: 'transaction' });
      const itemCreate = jest.fn().mockResolvedValue({ id: 'item' });
      const findTransaction = jest.fn().mockResolvedValue({
        id: 'transaction',
        transactionItems: [],
      });
      const tx = {
        $queryRaw: productQuery,
        transaction: {
          create: transactionCreate,
          findUniqueOrThrow: findTransaction,
        },
        transactionItem: { create: itemCreate },
      };
      const prisma = {
        $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
      };
      const service = new TransactionService(prisma as never);

      await service.initiateTransaction({
        tenantId: 'tenant',
        memberId: 'member',
        method,
        items: [
          {
            productId: 'product',
            productQuantity: 2,
            amount: 2000,
            idempotencyKey: 'item-key',
          },
        ],
      });

      expect(itemCreate).toHaveBeenCalledTimes(1);
      expect(reserveProductSale).toHaveBeenCalledWith(
        tx,
        {
          tenantId: 'tenant',
          transactionItemId: 'item',
          productId: 'product',
          quantity: 2,
          staffUserId: null,
        },
        pending,
      );
    },
  );
});
