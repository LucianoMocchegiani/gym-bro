import { BadRequestException } from '@nestjs/common';
import { reserveProductSale } from './product-sales';

function txFor(stock: number, active = true) {
  const calls: string[] = [];
  const tx = {
    $queryRaw: () => {
      calls.push('query');
      return [{ stock_quantity: stock, active, name: 'Botella' }];
    },
    $executeRaw: (strings: TemplateStringsArray) => {
      calls.push(strings.join(''));
      return 1;
    },
  } as never;
  return { tx, calls };
}

const sale = {
  tenantId: 'tenant',
  transactionItemId: 'item',
  productId: 'product',
  quantity: 1,
  staffUserId: null,
};

describe('reserveProductSale', () => {
  it('rejects an invalid quantity before querying or writing', async () => {
    const { tx, calls } = txFor(4);
    await expect(
      reserveProductSale(tx, { ...sale, quantity: -1 }, true),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(calls).toHaveLength(0);
  });

  it('rejects an unavailable item before writing a reservation', async () => {
    const { tx, calls } = txFor(0);
    await expect(reserveProductSale(tx, sale, true)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(calls).toHaveLength(1);
  });

  it('does not reserve an archived product', async () => {
    const { tx, calls } = txFor(4, false);
    await expect(reserveProductSale(tx, sale, true)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(calls).toHaveLength(1);
  });

  it('decrements stock and persists a reservation for a pending payment', async () => {
    const { tx, calls } = txFor(4);
    await reserveProductSale(tx, sale, true);
    expect(calls).toHaveLength(3);
    expect(calls[1]).toContain('UPDATE products SET stock_quantity');
    expect(calls[2]).toContain('INSERT INTO product_sale_items');
  });

  it('records a stock movement for an immediate sale', async () => {
    const { tx, calls } = txFor(4);
    await reserveProductSale(tx, sale, false);
    expect(calls).toHaveLength(4);
    expect(calls[3]).toContain('INSERT INTO product_stock_movements');
  });
});
