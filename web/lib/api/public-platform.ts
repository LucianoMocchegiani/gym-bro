/**
 * Catálogo público de packs de plataforma (landing, sin auth).
 */

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

function apiBase(): string {
  return (
    process.env.API_INTERNAL_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
    ''
  );
}

/**
 * Packs activos del tenant `admin`. Si la API no responde, lista vacía.
 */
export async function fetchPublicPlatformPacks(): Promise<
  PublicPlatformPack[]
> {
  const base = apiBase();
  if (!base) {
    return [];
  }
  try {
    const res = await fetch(`${base}/api/public/platform/packs`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return [];
    }
    const body: unknown = await res.json();
    return Array.isArray(body) ? (body as PublicPlatformPack[]) : [];
  } catch {
    return [];
  }
}
