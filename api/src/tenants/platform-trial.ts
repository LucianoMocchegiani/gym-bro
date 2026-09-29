/** Duración fija del mes de prueba Faciliter (cualquier pack). */
export const PLATFORM_TRIAL_DAYS = 30;

/** Gracia tras vencimiento / alta sin plan, antes del modo limitado. */
export const PLATFORM_ACCESS_GRACE_DAYS = 3;

/**
 * Tenants que nunca entran en modo limitado (seed).
 * Demo `gym-de-prueba` y plataforma `admin`.
 */
export const PLATFORM_UNLIMITED_TENANT_IDS: ReadonlySet<string> = new Set([
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
]);

/**
 * Suma días calendario a una fecha (prueba de plataforma, no `addOneMonth`).
 */
export function addCalendarDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
