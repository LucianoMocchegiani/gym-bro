import { BadRequestException } from '@nestjs/common';

/** Timezone de los días de negocio (caja, arqueo, gastos, reportes). */
export const BUSINESS_TIMEZONE = 'America/Argentina/Buenos_Aires' as const;

/**
 * `YYYY-MM-DD` → Date `@db.Date` (medianoche UTC).
 *
 * @throws {BadRequestException} Formato inválido o día inexistente.
 */
export function parseBusinessDate(ymd: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) {
    throw new BadRequestException('date must be YYYY-MM-DD');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestException('date is not a valid calendar day');
  }
  return date;
}

/** Día de negocio (timezone BA) de un instante, como `YYYY-MM-DD`. */
export function businessYmdOf(at: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/** Date `@db.Date` → `YYYY-MM-DD`. */
export function formatBusinessDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
