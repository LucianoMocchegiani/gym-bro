import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { requestTenantSlug } from '@/lib/gym-site';
import { MemberArea } from '@/components/gym-site/portal/MemberArea';

/** Secciones del portal (`/portal/clases`, `/portal/carrito`, …): exigen socio. */
export default async function MemberAreaLayout({
  children,
}: {
  children: ReactNode;
}) {
  const slug = await requestTenantSlug();
  if (!slug) {
    notFound();
  }
  return <MemberArea slug={slug}>{children}</MemberArea>;
}
