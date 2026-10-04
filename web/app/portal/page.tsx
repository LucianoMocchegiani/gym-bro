import { notFound } from 'next/navigation';
import { requestTenantSlug } from '@/lib/gym-site';
import { MemberPortal } from '@/components/gym-site/MemberPortal';
import { MemberSignupReturn } from '@/components/gym-site/MemberSignupReturn';

/**
 * Inicio del portal del socio. Mercado Pago vuelve acá: `?compra=` (pago de un
 * socio) o `?alta=` (alta web pagada, todavía sin sesión de socio).
 */
export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{
    compra?: string;
    alta?: string;
    status?: string;
    collection_status?: string;
  }>;
}) {
  const slug = await requestTenantSlug();
  if (!slug) {
    notFound();
  }
  const query = await searchParams;
  const mpStatus = query.collection_status ?? query.status ?? null;
  if (query.alta) {
    return (
      <MemberSignupReturn slug={slug} signupId={query.alta} mpStatus={mpStatus} />
    );
  }
  const purchase = query.compra ? { id: query.compra, status: mpStatus } : null;
  return <MemberPortal slug={slug} purchase={purchase} />;
}
