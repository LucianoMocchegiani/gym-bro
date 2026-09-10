const WINDOW_MS = 60 * 60 * 1000;

type Bucket = { hits: number[]; };

const buckets = new Map<string, Bucket>();

function prune(hits: number[], now: number): number[] {
  return hits.filter((ts) => now - ts < WINDOW_MS);
}

/**
 * Tope simple en memoria (una instancia). 429 si se pasa.
 *
 * @returns true si el hit entra.
 */
export function consumeRateLimit(key: string, maxHits: number): boolean {
  const now = Date.now();
  const current = buckets.get(key);
  const hits = prune(current?.hits ?? [], now);
  if (hits.length >= maxHits) {
    buckets.set(key, { hits });
    return false;
  }
  hits.push(now);
  buckets.set(key, { hits });
  return true;
}

/**
 * IP del visitante (túnel Cloudflare o proxy).
 */
export function clientIp(headers: {
  get(name: string): string | null | undefined;
}): string {
  const cf = headers.get('cf-connecting-ip')?.trim();
  if (cf) {
    return cf;
  }
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) {
    return forwarded;
  }
  return 'unknown';
}
