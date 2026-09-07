const TZ = 'America/Argentina/Buenos_Aires';
const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD en zona BA. */
export function baYmd(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date);
}

export function isYmd(value: string): boolean {
  return YMD.test(value);
}

/**
 * Inicio y fin del día calendario en BA, como ISO UTC.
 *
 * @remarks BA no usa DST (UTC−3). Nest parsea `from`/`to` con `new Date()`.
 */
export function baDayUtcRange(ymd = baYmd()): { ymd: string; from: string; to: string } {
  const from = new Date(`${ymd}T00:00:00.000-03:00`);
  const to = new Date(`${ymd}T23:59:59.999-03:00`);
  return { ymd, from: from.toISOString(), to: to.toISOString() };
}

/**
 * Rango para `GET /api/sessions`. Sin fechas → hoy BA. `YYYY-MM-DD` → ese día en BA.
 */
export function sessionsRange(
  from?: string,
  to?: string,
): { from: string; to: string } {
  if (!from && !to) {
    const day = baDayUtcRange();
    return { from: day.from, to: day.to };
  }
  const fromIso =
    from && isYmd(from) ? baDayUtcRange(from).from : (from ?? baDayUtcRange().from);
  const toIso = to && isYmd(to) ? baDayUtcRange(to).to : (to ?? baDayUtcRange().to);
  return { from: fromIso, to: toIso };
}
