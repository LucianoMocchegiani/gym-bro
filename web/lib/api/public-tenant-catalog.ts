/**
 * Tienda pública del gym (`{slug}/`, sin auth).
 */

import { fetchPublicApi } from '@/lib/api/public-fetch';

export type StorePackComponent = {
  serviceId: string;
  serviceName: string;
  serviceType: 'ACCESO_LIBRE' | 'POR_SESIONES';
  creditAmount: number | null;
};

/** Pack vendible del gym (mismo shape que `GET /me/packs`). */
export type StorePack = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  billingPeriod: 'MONTHLY' | 'ONE_TIME';
  creditsExpireAt: string | null;
  kind: 'ACCESS' | 'CREDITS' | 'MIXED';
  components: StorePackComponent[];
};

export type PublicTenantCatalog = {
  tenant: { name: string; slug: string };
  /** true = MP conectado: se compra online. */
  onlineCheckout: boolean;
  packs: StorePack[];
};

/**
 * @returns `null` si el gym no existe, está suspendido o la API no responde.
 */
export function fetchPublicTenantCatalog(
  slug: string,
): Promise<PublicTenantCatalog | null> {
  return fetchPublicApi<PublicTenantCatalog>(
    `/public/tenants/by-slug/${encodeURIComponent(slug)}/packs`,
  );
}

/** Línea legible de un componente: «Acceso libre a X» / «8 clases de Y». */
export function storeComponentLabel(c: StorePackComponent): string {
  if (c.serviceType === 'ACCESO_LIBRE') {
    return `Acceso libre a ${c.serviceName}`;
  }
  const n = c.creditAmount ?? 0;
  return `${n} ${n === 1 ? 'clase' : 'clases'} de ${c.serviceName}`;
}
