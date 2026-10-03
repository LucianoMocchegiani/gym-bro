import type { ReactNode } from 'react';
import { CheckList } from '@/components/marketing/CheckList';
import { formatMoney } from '@/lib/cash-labels';

/** «$ 10.000 / mes», «$ 5.000» o «A convenir» (precio 0). */
export function formatPackPrice(
  price: number,
  billingPeriod: 'MONTHLY' | 'ONE_TIME',
): string {
  if (price < 1) {
    return 'A convenir';
  }
  return `${formatMoney(price)}${billingPeriod === 'MONTHLY' ? ' / mes' : ''}`;
}

/**
 * Tarjeta de pack en una grilla `.mkt-plans`.
 */
export function PackPlanCard({
  name,
  price,
  billingPeriod,
  description,
  items,
  action,
}: {
  name: string;
  price: number;
  billingPeriod: 'MONTHLY' | 'ONE_TIME';
  description: string | null;
  items: string[];
  action: ReactNode;
}) {
  return (
    <div className="mkt-plan">
      <p className="eyebrow">Incluye</p>
      <h3>{name}</h3>
      <p className="mkt-price">{formatPackPrice(price, billingPeriod)}</p>
      {description ? <p className="muted">{description}</p> : null}
      <CheckList items={items} />
      {action}
    </div>
  );
}
