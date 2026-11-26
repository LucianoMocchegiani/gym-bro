const MAX_STOCK = 2_147_483_647;

export function calculateStockAfter(
  current: number,
  type: 'IN' | 'OUT',
  quantity: number,
): number | null {
  if (
    !Number.isInteger(current) ||
    current < 0 ||
    current > MAX_STOCK ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_STOCK
  ) {
    return null;
  }
  const next = current + (type === 'IN' ? quantity : -quantity);
  return next >= 0 && next <= MAX_STOCK ? next : null;
}
