import { BadRequestException } from '@nestjs/common';
import { createMpProductLine } from './mp-product-line';

describe('createMpProductLine', () => {
  const product = {
    id: 'product',
    name: 'Agua',
    description: null,
    price: 500,
    active: true,
  };

  it('uses the catalog item and quantity for a Mercado Pago line', () => {
    expect(createMpProductLine(product, 2)).toMatchObject({
      kind: 'PRODUCT',
      refId: product.id,
      title: product.name,
      quantity: 2,
      amount: product.price,
    });
  });

  it.each([0, 1.5, Number.MAX_SAFE_INTEGER])(
    'rejects an invalid quantity %s',
    (quantity) => {
      expect(() => createMpProductLine(product, quantity)).toThrow(
        BadRequestException,
      );
    },
  );

  it('rejects an archived product', () => {
    expect(() => createMpProductLine({ ...product, active: false }, 1)).toThrow(
      BadRequestException,
    );
  });
});
