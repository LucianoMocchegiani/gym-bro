/**
 * Descuento por pago sin comisión en Caja (RN-PAG-020).
 */

import { apiRequest } from '@/lib/api/client';

export type CounterMethod = 'CASH' | 'TRANSFER';

/** Medio, descuento y referencia de un cobro presencial de Caja. */
export type CounterChargeOptions = {
  method: CounterMethod;
  discountPercent?: number;
  transferReference?: string;
};

export type CashDiscountDefaults = {
  cashDiscountPercent: number;
  transferDiscountPercent: number;
};

/**
 * Defaults del gym que Caja precarga según el medio (staff).
 */
export function getCashDiscountDefaults(): Promise<CashDiscountDefaults> {
  return apiRequest<CashDiscountDefaults>('/cash/discount-defaults');
}

/**
 * Precio con descuento, igual que la API: redondeo al peso y mínimo $1.
 */
export function applyDiscount(listAmount: number, percent: number): number {
  const bps = Math.round(percent * 100);
  if (bps <= 0 || listAmount < 1) {
    return listAmount;
  }
  return Math.max(1, Math.round((listAmount * (10000 - bps)) / 10000));
}
