import { BadRequestException } from '@nestjs/common';
import { createCashProductItems } from './cash-product-items';

describe('createCashProductItems', () => {
  const product = { id: 'product', name: 'Agua', price: 500, active: true };

  it('creates one sale item with catalog price and requested quantity', () => {
    expect(
      createCashProductItems(
        [{ id: product.id, quantity: 2 }],
        [product],
        'cart-key',
        3,
      ),
    ).toEqual({
      items: [
        {
          productId: product.id,
          productQuantity: 2,
          amount: 1000,
          idempotencyKey: 'cart-key-3',
        },
      ],
      names: ['Agua'],
      quantity: 2,
    });
  });

  it('rejects invalid quantities before a checkout item is created', () => {
    expect(() =>
      createCashProductItems(
        [{ id: product.id, quantity: 0 }],
        [product],
        'cart-key',
        0,
      ),
    ).toThrow(BadRequestException);
  });
});
