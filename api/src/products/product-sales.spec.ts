import { BadRequestException } from '@nestjs/common';
import {
  refundProductSale,
  reserveProductSale,
  validateProductRestockDecisions,
} from './product-sales';

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

  it('decrements stock and records a pending reservation', async () => {
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

describe('validateProductRestockDecisions', () => {
  it('requires a choice for every returned product', () => {
    expect(
      validateProductRestockDecisions(['item-1', 'item-2'], [
        { transactionItemId: 'item-1', restock: true },
        { transactionItemId: 'item-2', restock: false },
      ]),
    ).toEqual(
      new Map([
        ['item-1', true],
        ['item-2', false],
      ]),
    );
  });

  it('rejects missing, duplicate, or unrelated decisions', () => {
    for (const decisions of [
      [],
      [
        { transactionItemId: 'item-1', restock: true },
        { transactionItemId: 'item-1', restock: false },
      ],
      [{ transactionItemId: 'other-item', restock: true }],
    ]) {
      expect(() =>
        validateProductRestockDecisions(['item-1'], decisions),
      ).toThrow(BadRequestException);
    }
  });
});

describe('refundProductSale', () => {
  function refundTx(refundedAt: Date | null, product: boolean) {
    const calls: string[] = [];
    let queryCount = 0;
    const tx = {
      $queryRaw: (strings: TemplateStringsArray) => {
        calls.push(strings.join(''));
        queryCount += 1;
        if (queryCount === 1) {
          return [
            {
              product_id: 'product',
              quantity: 2,
              status: 'SOLD',
              refunded_at: refundedAt,
            },
          ];
        }
        return product ? [{ stock_quantity: 7 }] : [];
      },
      $executeRaw: (strings: TemplateStringsArray) => {
        calls.push(strings.join(''));
        return 1;
      },
    } as never;
    return { tx, calls };
  }

  it('restocks and records a movement', async () => {
    const { tx, calls } = refundTx(null, true);
    await refundProductSale(tx, 'tenant', 'item', true, 'staff');
    expect(
      calls.filter((call) => call.includes('UPDATE products')),
    ).toHaveLength(1);
    expect(
      calls.filter((call) =>
        call.includes('INSERT INTO product_stock_movements'),
      ),
    ).toHaveLength(1);
    expect(calls[calls.length - 1]).toContain('restocked = ');
  });

  it('records a no-restock choice without changing inventory', async () => {
    const { tx, calls } = refundTx(null, false);
    await refundProductSale(tx, 'tenant', 'item', false, 'staff');
    expect(calls.some((call) => call.includes('UPDATE products'))).toBe(false);
    expect(
      calls.some((call) =>
        call.includes('INSERT INTO product_stock_movements'),
      ),
    ).toBe(false);
    expect(calls[calls.length - 1]).toContain('restocked = ');
  });

  it('does not restock again after a refund', async () => {
    const { tx, calls } = refundTx(new Date(), true);
    await refundProductSale(tx, 'tenant', 'item', true, 'staff');
    expect(calls).toHaveLength(1);
  });
});
