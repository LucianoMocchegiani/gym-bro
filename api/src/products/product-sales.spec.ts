import { BadRequestException } from '@nestjs/common';
import { reserveProductSale } from './product-sales';

function txFor(stock: number, active = true) {
  let available = stock;
  const calls: string[] = [];
  const tx = {
    $queryRaw: async () => {
      calls.push('query');
      return [{ stock_quantity: available, active, name: 'Botella' }];
    },
    $executeRaw: async (strings: TemplateStringsArray) => {
      calls.push(strings.join(''));
      if (strings.join('').includes('UPDATE products SET stock_quantity')) {
        available -= 1;
      }
      return 1;
    },
  } as never;
  return { tx, calls };
}

describe('reserveProductSale', () => {
  it('rejects an unavailable item before writing a reservation', async () => {
    const { tx, calls } = txFor(0);
    await expect(
      reserveProductSale(tx, {
        tenantId: 'tenant', transactionItemId: 'item', productId: 'product',
        quantity: 1, staffUserId: null,
      }, true),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(calls).toHaveLength(1);
  });

  it('does not reserve an archived product', async () => {
    const { tx, calls } = txFor(4, false);
    await expect(
      reserveProductSale(tx, {
        tenantId: 'tenant', transactionItemId: 'item', productId: 'product',
        quantity: 1, staffUserId: null,
      }, true),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(calls).toHaveLength(1);
  });
});
