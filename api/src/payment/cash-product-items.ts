import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { TransactionItemInput } from './transaction.service';

export type CashProduct = {
  id: string;
  name: string;
  price: number;
  active: boolean;
};

type ProductCartInput = { id: string; quantity?: number };

export function createCashProductItems(
  items: ProductCartInput[],
  products: CashProduct[],
  idempotencyKey: string,
  firstIndex: number,
): { items: TransactionItemInput[]; names: string[]; quantity: number } {
  const catalog = new Map(products.map((product) => [product.id, product]));
  let index = firstIndex;
  let quantity = 0;
  const names: string[] = [];
  const transactionItems = items.map((item) => {
    const product = catalog.get(item.id);
    if (!product) throw new NotFoundException('Producto no encontrado.');
    if (!product.active) {
      throw new BadRequestException('El producto está archivado.');
    }
    const count = item.quantity ?? 1;
    const amount = product.price * count;
    if (
      !Number.isSafeInteger(count) ||
      count < 1 ||
      !Number.isSafeInteger(amount) ||
      amount < 1
    ) {
      throw new BadRequestException(
        'La cantidad o el precio del producto no son válidos.',
      );
    }
    quantity += count;
    names.push(product.name);
    return {
      productId: product.id,
      productQuantity: count,
      amount,
      idempotencyKey: `${idempotencyKey}-${index++}`,
    };
  });
  return { items: transactionItems, names, quantity };
}
