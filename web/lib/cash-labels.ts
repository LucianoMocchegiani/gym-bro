/**
 * Formatea montos ARS enteros.
 */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Etiqueta de categoría de caja (venta vs devolución; no es ingreso/egreso).
 */
export function ledgerCategoryLabel(
  category: 'SALE' | 'REFUND',
): string {
  switch (category) {
    case 'SALE':
      return 'Venta';
    case 'REFUND':
      return 'Devolución';
    default:
      return category;
  }
}
