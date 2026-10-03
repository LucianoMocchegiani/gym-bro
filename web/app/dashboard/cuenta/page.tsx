import type { Metadata } from 'next';
import { StaffCuentaPage } from '@/components/StaffCuentaPage';

export const metadata: Metadata = {
  title: 'Mi cuenta',
  robots: { index: false, follow: false },
};

/**
 * Cuenta del staff en el gym (`{slug}/dashboard/cuenta`).
 */
export default function DashboardCuentaPage() {
  return <StaffCuentaPage />;
}
