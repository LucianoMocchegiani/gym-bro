'use client';

import type { ReactNode } from 'react';
import { Panel } from '@/components/AdminUi';
import { SkeletonCards } from '@/components/Skeleton';

export type KpiCardData = {
  key: string;
  label: string;
  value: string;
  hint: string | null;
  icon: ReactNode;
  live?: boolean;
};

/**
 * Grilla de KPIs del dashboard con skeleton integrado.
 *
 * @remarks Extraída del page para que el estado de carga no deforme la vista.
 */
export function DashboardKpis({
  loading,
  cards,
  errors,
}: {
  loading: boolean;
  cards: KpiCardData[];
  errors: string[];
}) {
  if (loading) {
    return <SkeletonCards count={4} />;
  }
  if (errors.length > 0) {
    return <p className="error">{errors.join(' · ')}</p>;
  }
  if (cards.length === 0) {
    return (
      <p className="muted">
        No hay KPIs disponibles con tus permisos. Usá el menú lateral.
      </p>
    );
  }
  return (
    <div className="dash-kpi-primary">
      {cards.map((card) => (
        <Panel key={card.key} className="dash-kpi-card">
          <div className="dash-kpi-card-head">
            <span className="dash-kpi-icon">{card.icon}</span>
            <p className="dash-kpi-label">{card.label}</p>
          </div>
          <p className="stat-value dash-kpi-value">{card.value}</p>
          {card.hint ? (
            <p className="dash-kpi-hint">
              {card.live ? (
                <span className="dash-live-dot" aria-hidden="true" />
              ) : null}
              {card.hint}
            </p>
          ) : null}
        </Panel>
      ))}
    </div>
  );
}