import type { Metadata } from 'next';
import { DashboardHome } from './dashboard-home';

export const metadata: Metadata = {
  title: 'Inicio',
  robots: { index: false, follow: false },
};

/**
 * Inicio del panel Staff (`{slug}/dashboard`).
 */
export default function DashboardPage() {
  return <DashboardHome />;
}
