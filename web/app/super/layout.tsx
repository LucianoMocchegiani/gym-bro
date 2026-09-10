import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Super Admin',
  robots: { index: false, follow: false },
};

/**
 * Panel Super: fuera del índice de buscadores.
 */
export default function SuperLayout({ children }: { children: ReactNode }) {
  return children;
}
