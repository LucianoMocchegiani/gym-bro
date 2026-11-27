import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

type ProductSale = {
  tenantId: string;
  transactionItemId: string;
  productId: string;
  quantity: number;
  staffUserId: string | null;
};

async function movement(
  tx: Tx,
  input: ProductSale,
  type: 'IN' | 'OUT',
  delta: number,
  after: number,
  reason: string,
) {
  await tx.$executeRaw`
    INSERT INTO product_stock_movements
      (id, tenant_id, product_id, type, quantity, quantity_delta,
       quantity_after, reason, created_by_staff_id)
    VALUES (
      ${randomUUID()}::uuid, ${input.tenantId}::uuid, ${input.productId}::uuid,
      ${type}, ${Math.abs(delta)}, ${delta}, ${after}, ${reason},
      ${input.staffUserId}::uuid
    )`;
}

export function validateProductRestockDecisions(
  productItemIds: string[],
  decisions: { transactionItemId: string; restock: boolean }[],
): Map<string, boolean> {
  const byItem = new Map<string, boolean>(
    decisions.map((decision) => [decision.transactionItemId, decision.restock]),
  );
  if (
    byItem.size !== decisions.length ||
    byItem.size !== productItemIds.length ||
    productItemIds.some((id) => !byItem.has(id))
  ) {
    throw new BadRequestException(
      'Indicá si querés reponer el stock para cada producto devuelto.',
    );
  }
  return byItem;
}

/** Decrements available stock under row lock before linking an item to a sale. */
export async function reserveProductSale(
  tx: Tx,
  input: ProductSale,
  pendingPayment: boolean,
): Promise<void> {
  if (!Number.isSafeInteger(input.quantity) || input.quantity < 1) {
    throw new BadRequestException('La cantidad debe ser un entero positivo.');
  }
  const [product] = await tx.$queryRaw<
    { stock_quantity: number; active: boolean; name: string }[]
  >`
    SELECT stock_quantity, active, name FROM products
    WHERE id = ${input.productId}::uuid AND tenant_id = ${input.tenantId}::uuid
    FOR UPDATE`;
  if (!product) throw new NotFoundException('Producto no encontrado.');
  if (!product.active)
    throw new BadRequestException('El producto está archivado.');
  if (product.stock_quantity < input.quantity) {
    throw new BadRequestException(`Stock insuficiente para ${product.name}.`);
  }
  const after = product.stock_quantity - input.quantity;
  await tx.$executeRaw`
    UPDATE products SET stock_quantity = ${after}, updated_at = now()
    WHERE id = ${input.productId}::uuid AND tenant_id = ${input.tenantId}::uuid`;
  await tx.$executeRaw`
    INSERT INTO product_sale_items
      (id, tenant_id, transaction_item_id, product_id, quantity, status)
    VALUES (
      ${randomUUID()}::uuid, ${input.tenantId}::uuid,
      ${input.transactionItemId}::uuid, ${input.productId}::uuid,
      ${input.quantity}, ${pendingPayment ? 'RESERVED' : 'SOLD'}::product_sale_status
    )`;
  if (!pendingPayment) {
    await movement(tx, input, 'OUT', -input.quantity, after, 'Venta en Caja');
  }
}

/** Converts a pending reservation once; rejected/cancelled payments release it. */
export async function resolveProductSales(
  tx: Tx,
  tenantId: string,
  transactionId: string,
  approved: boolean,
  staffUserId: string | null,
): Promise<void> {
  const sales = await tx.$queryRaw<
    {
      transaction_item_id: string;
      product_id: string;
      quantity: number;
      status: string;
    }[]
  >`
    SELECT s.transaction_item_id, s.product_id, s.quantity, s.status
    FROM product_sale_items s
    JOIN transaction_items i ON i.id = s.transaction_item_id
    WHERE s.tenant_id = ${tenantId}::uuid AND i.transaction_id = ${transactionId}::uuid
    FOR UPDATE OF s`;
  for (const sale of sales) {
    if (sale.status !== 'RESERVED') continue;
    if (approved) {
      await tx.$executeRaw`
        UPDATE product_sale_items SET status = 'SOLD'::product_sale_status
        WHERE transaction_item_id = ${sale.transaction_item_id}::uuid`;
      const [product] = await tx.$queryRaw<{ stock_quantity: number }[]>`
        SELECT stock_quantity FROM products
        WHERE id = ${sale.product_id}::uuid AND tenant_id = ${tenantId}::uuid`;
      await movement(
        tx,
        {
          tenantId,
          transactionItemId: sale.transaction_item_id,
          productId: sale.product_id,
          quantity: sale.quantity,
          staffUserId,
        },
        'OUT',
        -sale.quantity,
        product.stock_quantity,
        'Venta MP aprobada',
      );
    } else {
      const [product] = await tx.$queryRaw<{ stock_quantity: number }[]>`
        UPDATE products SET stock_quantity = stock_quantity + ${sale.quantity}, updated_at = now()
        WHERE id = ${sale.product_id}::uuid AND tenant_id = ${tenantId}::uuid
        RETURNING stock_quantity`;
      await tx.$executeRaw`
        UPDATE product_sale_items SET status = 'RELEASED'::product_sale_status
        WHERE transaction_item_id = ${sale.transaction_item_id}::uuid`;
      await movement(
        tx,
        {
          tenantId,
          transactionItemId: sale.transaction_item_id,
          productId: sale.product_id,
          quantity: sale.quantity,
          staffUserId,
        },
        'IN',
        sale.quantity,
        product.stock_quantity,
        'Pago MP rechazado o cancelado; reserva liberada',
      );
    }
  }
}

/** Records an explicit refund decision and restocks at most once. */
export async function refundProductSale(
  tx: Tx,
  tenantId: string,
  transactionItemId: string,
  restock: boolean,
  staffUserId: string | null,
): Promise<void> {
  const [sale] = await tx.$queryRaw<
    {
      product_id: string;
      quantity: number;
      status: string;
      refunded_at: Date | null;
    }[]
  >`
    SELECT product_id, quantity, status, refunded_at FROM product_sale_items
    WHERE tenant_id = ${tenantId}::uuid AND transaction_item_id = ${transactionItemId}::uuid
    FOR UPDATE`;
  if (!sale) {
    throw new BadRequestException('No se encontró la venta del producto.');
  }
  if (sale.status !== 'SOLD')
    throw new BadRequestException('La venta del producto no está confirmada.');
  if (sale.refunded_at) return;
  if (restock) {
    const [product] = await tx.$queryRaw<{ stock_quantity: number }[]>`
      UPDATE products SET stock_quantity = stock_quantity + ${sale.quantity}, updated_at = now()
      WHERE id = ${sale.product_id}::uuid AND tenant_id = ${tenantId}::uuid
      RETURNING stock_quantity`;
    if (!product) throw new NotFoundException('Producto no encontrado.');
    await movement(
      tx,
      {
        tenantId,
        transactionItemId,
        productId: sale.product_id,
        quantity: sale.quantity,
        staffUserId,
      },
      'IN',
      sale.quantity,
      product.stock_quantity,
      'Devolución de producto: repone stock',
    );
  }
  await tx.$executeRaw`
    UPDATE product_sale_items SET refunded_at = now(), restocked = ${restock}
    WHERE transaction_item_id = ${transactionItemId}::uuid`;
}
