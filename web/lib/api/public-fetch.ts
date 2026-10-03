/**
 * GET a endpoints públicos del API desde Server Components (sin auth, cache 60 s).
 */

function apiBase(): string {
  return (
    process.env.API_INTERNAL_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
    ''
  );
}

/**
 * @returns `null` si la API no está configurada, no responde o devuelve error.
 */
export async function fetchPublicApi<T>(path: string): Promise<T | null> {
  const base = apiBase();
  if (!base) {
    return null;
  }
  try {
    const res = await fetch(`${base}/api${path}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
