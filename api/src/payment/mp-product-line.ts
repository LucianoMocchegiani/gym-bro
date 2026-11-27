import { BadRequestException } from '@nestjs/common';
import type { MpCartLine } from './payment.types';

export type MpProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
};

export function createMpProductLine(
  product: MpProduct,
  quantity: number,
): MpCartLine {
  if (!product.active) {
    throw new BadRequestException('El producto está archivado.');
  }
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    !Number.isSafeInteger(product.price) ||
    product.price < 1 ||
    !Number.isSafeInteger(product.price * quantity)
  ) {
    throw new BadRequestException(
      'La cantidad o el precio del producto no son válidos.',
    );
  }
  return {
    kind: 'PRODUCT',
    refId: product.id,
    title: product.name,
    description: product.description ?? undefined,
    quantity,
    amount: product.price,
    transactionItemIds: [],
  };
}
