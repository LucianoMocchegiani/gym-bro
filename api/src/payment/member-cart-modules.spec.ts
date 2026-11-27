import { ForbiddenException } from '@nestjs/common';
import { assertMemberCartModules } from './member-cart-modules';

describe('assertMemberCartModules', () => {
  it('allows products for E-commerce and Club items for Club', () => {
    expect(() =>
      assertMemberCartModules(['ecommerce'], [{ kind: 'PRODUCT' }]),
    ).not.toThrow();
    expect(() =>
      assertMemberCartModules(['club'], [{ kind: 'PACK' }]),
    ).not.toThrow();
  });

  it('allows mixed carts only when both modules are active', () => {
    expect(() =>
      assertMemberCartModules(
        ['club', 'ecommerce'],
        [{ kind: 'PACK' }, { kind: 'PRODUCT' }],
      ),
    ).not.toThrow();
  });

  it('rejects items outside the tenant modules', () => {
    expect(() =>
      assertMemberCartModules(['club'], [{ kind: 'PRODUCT' }]),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertMemberCartModules(['ecommerce'], [{ kind: 'DROP_IN' }]),
    ).toThrow(ForbiddenException);
  });
});
