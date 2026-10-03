/**
 * Catálogo público de packs de plataforma (landing, sin auth).
 */

import { fetchPublicApi } from '@/lib/api/public-fetch';

export type PublicPlatformPack = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billingPeriod: 'MONTHLY' | 'ONE_TIME';
  /** false = se cobra desde el primer mes (sin prueba). */
  offersPlatformTrial: boolean;
  services: { id: string; name: string }[];
};

/**
 * Packs activos del tenant `admin`. Si la API no responde, lista vacía.
 */
export async function fetchPublicPlatformPacks(): Promise<
  PublicPlatformPack[]
> {
  const body = await fetchPublicApi<unknown>('/public/platform/packs');
  return Array.isArray(body) ? (body as PublicPlatformPack[]) : [];
}
