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

export const REPORT_PERIODS = [
  'this_week',
  'last_week',
  'this_month',
  'last_month',
  'this_year',
] as const;

export type ReportPeriod = (typeof REPORT_PERIODS)[number];

function shiftYmd(ymd: string, days: number): string {
  const ms = Date.parse(`${ymd}T12:00:00.000-03:00`) + days * 86_400_000;
  return baYmd(new Date(ms));
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function lastDayOfMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

function mondayOfWeek(ymd: string): string {
  const dow = new Date(`${ymd}T12:00:00.000-03:00`).getUTCDay();
  const offsetMon = (dow + 6) % 7;
  return shiftYmd(ymd, -offsetMon);
}

/**
 * Rango YYYY-MM-DD (BA) para `GET /api/reports/summary`.
 *
 * @remarks this_month / this_year cortan en hoy. last_week = lun–dom previo.
 */
export function baReportRange(period: ReportPeriod, today = baYmd()): { from: string; to: string } {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  if (period === 'this_month') {
    return { from: `${year}-${pad2(month)}-01`, to: today };
  }
  if (period === 'last_month') {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const last = lastDayOfMonth(prevYear, prevMonth);
    return {
      from: `${prevYear}-${pad2(prevMonth)}-01`,
      to: `${prevYear}-${pad2(prevMonth)}-${pad2(last)}`,
    };
  }
  if (period === 'this_year') {
    return { from: `${year}-01-01`, to: today };
  }
  const monday = mondayOfWeek(today);
  if (period === 'this_week') {
    return { from: monday, to: today };
  }
  return { from: shiftYmd(monday, -7), to: shiftYmd(monday, -1) };
}

/**
 * Resuelve period o from/to. Sin nada → mes calendario actual (BA).
 */
export function resolveReportYmd(input: {
  period?: string;
  from?: string;
  to?: string;
}): { from: string; to: string; period: ReportPeriod | null } {
  const fromRaw = input.from?.trim();
  const toRaw = input.to?.trim();
  if ((fromRaw && isYmd(fromRaw)) || (toRaw && isYmd(toRaw))) {
    const today = baYmd();
    return {
      from: fromRaw && isYmd(fromRaw) ? fromRaw : baReportRange('this_month').from,
      to: toRaw && isYmd(toRaw) ? toRaw : today,
      period: null,
    };
  }
  const period = REPORT_PERIODS.find((item) => item === input.period);
  if (period) {
    const range = baReportRange(period);
    return { ...range, period };
  }
  const range = baReportRange('this_month');
  return { ...range, period: 'this_month' };
}
