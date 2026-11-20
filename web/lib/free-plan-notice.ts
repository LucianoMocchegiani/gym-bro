const FREE_PLAN_NOTICE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export function shouldShowFreePlanNotice(
  lastShownAt: string | null,
  now: number,
): boolean {
  if (lastShownAt === null) {
    return true;
  }
  const previous = Number(lastShownAt);
  return !Number.isFinite(previous) || now - previous >= FREE_PLAN_NOTICE_INTERVAL_MS;
}
