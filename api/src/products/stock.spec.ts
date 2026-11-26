import { calculateStockAfter } from './stock';

describe('calculateStockAfter', () => {
  it('applies incoming and outgoing stock movements', () => {
    expect(calculateStockAfter(4, 'IN', 3)).toBe(7);
    expect(calculateStockAfter(4, 'OUT', 3)).toBe(1);
  });

  it('refuses a negative balance and invalid quantities', () => {
    expect(calculateStockAfter(2, 'OUT', 3)).toBeNull();
    expect(calculateStockAfter(2, 'IN', 0)).toBeNull();
    expect(calculateStockAfter(-1, 'IN', 1)).toBeNull();
  });
});
