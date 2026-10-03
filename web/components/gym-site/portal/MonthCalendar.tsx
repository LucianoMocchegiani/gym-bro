const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Primer día del mes de `d` (00:00 local). */
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Grilla mensual como `MonthCalendar` de la app: sin meses anteriores al
 * actual, los días pasados no se eligen y un punto marca los días con clases.
 */
export function MonthCalendar({
  month,
  daysWithSessions,
  selectedDay,
  onShiftMonth,
  onSelectDay,
}: {
  /** Primer día del mes visible. */
  month: Date;
  daysWithSessions: Set<number>;
  selectedDay: number | null;
  onShiftMonth: (delta: number) => void;
  onSelectDay: (day: number) => void;
}) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const canGoPrev = month > startOfMonth(now);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leading = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const title = month.toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="month-cal">
      <div className="month-cal-head">
        <button
          type="button"
          className="month-cal-arrow"
          aria-label="Mes anterior"
          disabled={!canGoPrev}
          onClick={() => onShiftMonth(-1)}
        >
          ‹
        </button>
        <p className="month-cal-title">{title}</p>
        <button
          type="button"
          className="month-cal-arrow"
          aria-label="Mes siguiente"
          onClick={() => onShiftMonth(1)}
        >
          ›
        </button>
      </div>
      <div className="month-cal-grid">
        {WEEKDAYS.map((w) => (
          <span key={w} className="month-cal-weekday">
            {w}
          </span>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const date = new Date(year, monthIndex, day);
          const isPast = date < today;
          const classes = ['month-cal-day'];
          if (date.getTime() === today.getTime()) classes.push('is-today');
          if (day === selectedDay) classes.push('is-on');
          if (daysWithSessions.has(day)) classes.push('has-sessions');
          return (
            <button
              key={day}
              type="button"
              className={classes.join(' ')}
              disabled={isPast}
              aria-pressed={day === selectedDay}
              onClick={() => onSelectDay(day)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
