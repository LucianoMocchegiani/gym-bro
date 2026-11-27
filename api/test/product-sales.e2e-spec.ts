import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';
import { refundProductSale } from '../src/products/product-sales';

const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeWithDatabase('product payment status trigger (PostgreSQL)', () => {
  const prisma = new PrismaClient();

  afterAll(async () => prisma.$disconnect());

  it('resolves reservations once, ignores late updates, and refunds idempotently', async () => {
    const migration = await readFile(
      join(
        __dirname,
        '../prisma/migrations/20261128120000_product_sales_payment_triggers/migration.sql',
      ),
      'utf8',
    );
    const [functionSql, triggerSql] = migration.split('$$ LANGUAGE plpgsql;');
    if (!functionSql || !triggerSql) {
      throw new Error('Could not parse product sales payment trigger migration');
    }

    const schema = `product_sales_${randomUUID().replaceAll('-', '')}`;
    const tenantId = randomUUID();
    const approvedTransactionId = randomUUID();
    const rejectedTransactionId = randomUUID();
    const approvedItemId = randomUUID();
    const rejectedItemId = randomUUID();
    const approvedProductId = randomUUID();
    const rejectedProductId = randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA ${schema}`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO ${schema}, public`);
      await tx.$executeRawUnsafe(
        "CREATE TYPE payment_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED')",
      );
      await tx.$executeRawUnsafe(
        "CREATE TYPE product_sale_status AS ENUM ('RESERVED', 'SOLD', 'RELEASED')",
      );
      await tx.$executeRawUnsafe(
        'CREATE TABLE transactions (id uuid PRIMARY KEY, recorded_by_staff_id uuid)',
      );
      await tx.$executeRawUnsafe(
        'CREATE TABLE transaction_items (id uuid PRIMARY KEY, tenant_id uuid, transaction_id uuid, status payment_status)',
      );
      await tx.$executeRawUnsafe(
        'CREATE TABLE products (id uuid PRIMARY KEY, tenant_id uuid, stock_quantity integer, updated_at timestamptz)',
      );
      await tx.$executeRawUnsafe(
        'CREATE TABLE product_sale_items (id uuid PRIMARY KEY, tenant_id uuid, transaction_item_id uuid, product_id uuid, quantity integer, status product_sale_status, refunded_at timestamptz, restocked boolean)',
      );
      await tx.$executeRawUnsafe(
        'CREATE TABLE product_stock_movements (id uuid PRIMARY KEY, tenant_id uuid, product_id uuid, type text, quantity integer, quantity_delta integer, quantity_after integer, reason text, created_by_staff_id uuid)',
      );
      await tx.$executeRawUnsafe(`${functionSql}$$ LANGUAGE plpgsql;`);
      await tx.$executeRawUnsafe(triggerSql);

      await tx.$executeRaw`
        INSERT INTO transactions (id, recorded_by_staff_id)
        VALUES (${approvedTransactionId}::uuid, NULL), (${rejectedTransactionId}::uuid, NULL)`;
      await tx.$executeRaw`
        INSERT INTO transaction_items (id, tenant_id, transaction_id, status)
        VALUES
          (${approvedItemId}::uuid, ${tenantId}::uuid, ${approvedTransactionId}::uuid, 'PENDING'),
          (${rejectedItemId}::uuid, ${tenantId}::uuid, ${rejectedTransactionId}::uuid, 'PENDING')`;
      await tx.$executeRaw`
        INSERT INTO products (id, tenant_id, stock_quantity, updated_at)
        VALUES
          (${approvedProductId}::uuid, ${tenantId}::uuid, 3, now()),
          (${rejectedProductId}::uuid, ${tenantId}::uuid, 4, now())`;
      await tx.$executeRaw`
        INSERT INTO product_sale_items (id, tenant_id, transaction_item_id, product_id, quantity, status)
        VALUES
          (${randomUUID()}::uuid, ${tenantId}::uuid, ${approvedItemId}::uuid, ${approvedProductId}::uuid, 2, 'RESERVED'),
          (${randomUUID()}::uuid, ${tenantId}::uuid, ${rejectedItemId}::uuid, ${rejectedProductId}::uuid, 3, 'RESERVED')`;

      await tx.$executeRaw`UPDATE transaction_items SET status = 'APPROVED' WHERE id = ${approvedItemId}::uuid`;
      await tx.$executeRaw`UPDATE transaction_items SET status = 'APPROVED' WHERE id = ${approvedItemId}::uuid`;
      await tx.$executeRaw`UPDATE transaction_items SET status = 'REJECTED' WHERE id = ${approvedItemId}::uuid`;
      await tx.$executeRaw`UPDATE transaction_items SET status = 'REJECTED' WHERE id = ${rejectedItemId}::uuid`;
      await tx.$executeRaw`UPDATE transaction_items SET status = 'APPROVED' WHERE id = ${rejectedItemId}::uuid`;

      const rows = await tx.$queryRaw<
        { status: string; stock_quantity: number; movement_count: number }[]
      >`
        SELECT s.status::text, p.stock_quantity,
               (SELECT count(*)::int FROM product_stock_movements m WHERE m.product_id = p.id) AS movement_count
        FROM product_sale_items s
        JOIN products p ON p.id = s.product_id
        ORDER BY s.status`;
      expect(rows).toEqual([
        { status: 'RELEASED', stock_quantity: 7, movement_count: 1 },
        { status: 'SOLD', stock_quantity: 3, movement_count: 1 },
      ]);

      const client = tx as unknown as Prisma.TransactionClient;
      await refundProductSale(client, tenantId, approvedItemId, true, null);
      await refundProductSale(client, tenantId, approvedItemId, true, null);
      const [refunded] = await tx.$queryRaw<
        { stock_quantity: number; refunded_at: Date | null; restocked: boolean; movement_count: number }[]
      >`
        SELECT p.stock_quantity, s.refunded_at, s.restocked,
               (SELECT count(*)::int FROM product_stock_movements m WHERE m.product_id = p.id) AS movement_count
        FROM product_sale_items s
        JOIN products p ON p.id = s.product_id
        WHERE s.transaction_item_id = ${approvedItemId}::uuid`;
      expect(refunded).toMatchObject({
        stock_quantity: 5,
        restocked: true,
        movement_count: 2,
      });
      expect(refunded?.refunded_at).toBeInstanceOf(Date);
    });
  });
});
