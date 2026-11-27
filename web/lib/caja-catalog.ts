import type { PackSummary } from '@/lib/api/packs';

export function isEcommerceOnly(modules: string[] | null): boolean {
  return Boolean(modules?.includes('ecommerce') && !modules.includes('club'));
}

export function packsForCaja(packs: PackSummary[], ecommerceOnly: boolean): PackSummary[] {
  return ecommerceOnly ? packs.filter((pack) => pack.billingPeriod === 'ONE_TIME') : packs;
}
