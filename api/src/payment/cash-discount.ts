/**
 * Descuento por pago sin comisión en Caja (RN-PAG-020).
 *
 * @remarks Porcentajes en centésimas (760 = 7,6 %) para no guardar decimales.
 * El monto con descuento se redondea al peso entero más cercano y nunca baja
 * de $1 si el precio de lista es ≥ $1.
 */
export const DEFAULT_CASH_DISCOUNT_BPS = 760;
export const DEFAULT_TRANSFER_DISCOUNT_BPS = 760;
export const MAX_DISCOUNT_BPS = 9900;

export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

export function bpsToPercent(bps: number): number {
  return bps / 100;
}

export function applyDiscount(listAmount: number, bps: number): number {
  if (bps <= 0 || listAmount < 1) {
    return listAmount;
  }
  return Math.max(1, Math.round((listAmount * (10000 - bps)) / 10000));
}
