/**
 * Etiquetas de conceptos de caja.
 */
export function formatCashConcept(
  concept: 'PACK_CONTRACT' | 'DROP_IN' | 'REFUND',
): string {
  switch (concept) {
    case 'PACK_CONTRACT':
      return 'Pack';
    case 'DROP_IN':
      return 'Drop-in';
    case 'REFUND':
      return 'Devolución';
    default:
      return concept;
  }
}

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
