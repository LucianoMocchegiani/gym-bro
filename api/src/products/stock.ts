export function calculateStockAfter(
  current: number,
  type: 'IN' | 'OUT',
  quantity: number,
): number | null {
  if (!Number.isInteger(current) || current < 0 || !Number.isInteger(quantity) || quantity < 1) {
    return null;
  }
  const next = current + (type === 'IN' ? quantity : -quantity);
  return next >= 0 ? next : null;
}
