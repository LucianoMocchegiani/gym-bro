import { Prisma } from '@prisma/client';
import {
  refundProductSale,
  reserveProductSale,
  resolveProductSales,
  validateProductRestockDecisions,
} from './product-sales';

type Sale = {
  transactionItemId: string;
  productId: string;
  quantity: number;
  status: string;
  refundedAt: Date | null;
  restocked: boolean | null;
};

function inventoryDatabase(initialStock: number) {
  let stock = initialStock;
  let movements = 0;
  const sales: Sale[] = [];
  const query = async (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<unknown[]> => {
    const sql = strings.join(' ');
    if (sql.includes('SELECT stock_quantity, active, name FROM products')) {
      return [{ stock_quantity: stock, active: true, name: 'Botella' }];
    }
    if (sql.includes('FROM product_sale_items s')) {
      return sales.map((sale) => ({
        transaction_item_id: sale.transactionItemId,
        product_id: sale.productId,
        quantity: sale.quantity,
        status: sale.status,
      }));
    }
    if (sql.includes('SELECT stock_quantity FROM products')) {
      return [{ stock_quantity: stock }];
    }
    if (sql.includes('SELECT product_id, quantity, status, refunded_at')) {
      const sale = sales.find((item) => item.transactionItemId === values[1]);
      return sale
        ? [{ ...sale, product_id: sale.productId, refunded_at: sale.refundedAt }]
        : [];
    }
    if (sql.includes('UPDATE products') && sql.includes('RETURNING stock_quantity')) {
      stock += Number(values[0]);
      return [{ stock_quantity: stock }];
    }
    throw new Error(`Unexpected query: ${sql}`);
  };
  const execute = async (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<number> => {
    const sql = strings.join(' ');
    if (sql.includes('UPDATE products SET stock_quantity =')) {
      stock = Number(values[0]);
    } else if (sql.includes('INSERT INTO product_sale_items')) {
      sales.push({
        transactionItemId: String(values[2]),
        productId: String(values[3]),
        quantity: Number(values[4]),
        status: String(values[5]),
        refundedAt: null,
        restocked: null,
      });
    } else if (sql.includes("SET status = 'SOLD'")) {
      const sale = sales.find((item) => item.transactionItemId === values[0]);
      if (sale) sale.status = 'SOLD';
    } else if (sql.includes("SET status = 'RELEASED'")) {
      const sale = sales.find((item) => item.transactionItemId === values[0]);
      if (sale) sale.status = 'RELEASED';
    } else if (sql.includes('INSERT INTO product_stock_movements')) {
      movements += 1;
    } else if (sql.includes('SET refunded_at = now()')) {
      const sale = sales.find((item) => item.transactionItemId === values[0]);
      if (sale) {
        sale.refundedAt = new Date();
        sale.restocked = Boolean(values[1]);
      }
    } else {
      throw new Error(`Unexpected statement: ${sql}`);
    }
    return 1;
  };
  return {
    tx: { $queryRaw: query, $executeRaw: execute } as unknown as Prisma.TransactionClient,
    get stock() {
      return stock;
    },
    get movements() {
      return movements;
    },
    sales,
  };
}

const saleInput = {
  tenantId: 'tenant-1',
  transactionItemId: 'item-1',
  productId: 'product-1',
  quantity: 2,
  staffUserId: 'staff-1',
};

describe('product sale inventory lifecycle integration', () => {
  it('reserves stock, confirms once, and ignores a repeated or late rejection', async () => {
    const db = inventoryDatabase(5);
    await reserveProductSale(db.tx, saleInput, true);
    expect(db.stock).toBe(3);

    await resolveProductSales(db.tx, 'tenant-1', 'transaction-1', true, 'staff-1');
    await resolveProductSales(db.tx, 'tenant-1', 'transaction-1', true, 'staff-1');
    await resolveProductSales(db.tx, 'tenant-1', 'transaction-1', false, 'staff-1');

    expect(db.sales[0]?.status).toBe('SOLD');
    expect(db.stock).toBe(3);
    expect(db.movements).toBe(1);
  });

  it('releases a rejected reservation once and ignores a late approval', async () => {
    const db = inventoryDatabase(5);
    await reserveProductSale(db.tx, saleInput, true);

    await resolveProductSales(db.tx, 'tenant-1', 'transaction-1', false, 'staff-1');
    await resolveProductSales(db.tx, 'tenant-1', 'transaction-1', false, 'staff-1');
    await resolveProductSales(db.tx, 'tenant-1', 'transaction-1', true, 'staff-1');

    expect(db.sales[0]?.status).toBe('RELEASED');
    expect(db.stock).toBe(5);
    expect(db.movements).toBe(1);
  });

  it.each([true, false])(
    'refunds a product with restock=%s exactly once',
    async (restock) => {
      const db = inventoryDatabase(5);
      await reserveProductSale(db.tx, saleInput, false);
      const decisions = validateProductRestockDecisions(['item-1'], [
        { transactionItemId: 'item-1', restock },
      ]);

      await refundProductSale(
        db.tx,
        'tenant-1',
        'item-1',
        decisions.get('item-1')!,
        'staff-1',
      );
      await refundProductSale(
        db.tx,
        'tenant-1',
        'item-1',
        decisions.get('item-1')!,
        'staff-1',
      );

      expect(db.stock).toBe(restock ? 5 : 3);
      expect(db.sales[0]?.restocked).toBe(restock);
      expect(db.movements).toBe(restock ? 2 : 1);
    },
  );
});
