/** Duración fija del mes de prueba Faciliter (cualquier pack). */
export const PLATFORM_TRIAL_DAYS = 30;

/**
 * Suma días calendario a una fecha (prueba de plataforma, no `addOneMonth`).
 */
export function addCalendarDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
