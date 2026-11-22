import { apiRequest } from '@/lib/api/client';

export type CounterMethod = 'CASH' | 'TRANSFER';
export type CounterChargeOptions = {
  method: CounterMethod;
  discountPercent?: number;
  transferReference?: string;
};

export type CashDiscountDefaults = {
  cashDiscountPercent: number;
  transferDiscountPercent: number;
  qrPointDiscountPercent: number;
  mpLinkDiscountPercent: number;
};

export function getCashDiscountDefaults(): Promise<CashDiscountDefaults> {
  return apiRequest<CashDiscountDefaults>('/cash/discount-defaults');
}

export function applyDiscount(listAmount: number, percent: number): number {
  const bps = Math.round(percent * 100);
  if (bps <= 0 || listAmount < 1) {
    return listAmount;
  }
  return Math.max(1, Math.round((listAmount * (10000 - bps)) / 10000));
}
