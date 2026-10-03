/** Zona de los gyms: horarios de sesiones, comprobantes y reportes. */
export const GYM_TZ = 'America/Argentina/Buenos_Aires';

/** «18:00». */
export function formatSessionTime(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: GYM_TZ,
  }).format(new Date(iso));
}

/** «lun 05/10 18:00». */
export function formatSessionWhen(iso: string): string {
  const day = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: GYM_TZ,
  }).format(new Date(iso));
  return `${day} ${formatSessionTime(iso)}`;
}

/** «lun 05/10 18:00–19:00». */
export function formatSessionRange(startsAt: string, endsAt: string): string {
  return `${formatSessionWhen(startsAt)}–${formatSessionTime(endsAt)}`;
}
