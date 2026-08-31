import 'package:flutter/material.dart';

import '../../core/widgets/shared_widgets.dart';

/// Grilla mensual: días táctiles, sin meses anteriores al actual.
///
/// Los días anteriores a hoy no se eligen. [daysWithSessions] marca
/// el número de día local con clases. Tocá un día para abrir su lista.
class MonthCalendar extends StatelessWidget {
  /// Crea el calendario.
  const MonthCalendar({
    super.key,
    required this.visibleMonth,
    required this.daysWithSessions,
    required this.onPrevMonth,
    required this.onNextMonth,
    required this.onSelectDay,
  });

  final DateTime visibleMonth;
  final Set<int> daysWithSessions;
  final VoidCallback onPrevMonth;
  final VoidCallback onNextMonth;
  final ValueChanged<DateTime> onSelectDay;

  static const _weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  bool get _canGoPrev {
    final now = DateTime.now();
    return visibleMonth.year > now.year ||
        (visibleMonth.year == now.year && visibleMonth.month > now.month);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final today = localDateOnly(DateTime.now());
    final year = visibleMonth.year;
    final month = visibleMonth.month;
    final daysInMonth = DateTime(year, month + 1, 0).day;
    final leading = (DateTime(year, month, 1).weekday + 6) % 7;
    final cellCount = leading + daysInMonth;

    return Column(
      children: [
        Row(
          children: [
            IconButton(
              tooltip: 'Mes anterior',
              onPressed: _canGoPrev ? onPrevMonth : null,
              icon: const Icon(Icons.chevron_left),
            ),
            Expanded(
              child: Text(
                formatMonthYear(DateTime(year, month)),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ),
            IconButton(
              tooltip: 'Mes siguiente',
              onPressed: onNextMonth,
              icon: const Icon(Icons.chevron_right),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Row(
          children: [
            for (final label in _weekdays)
              Expanded(
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: scheme.onSurface.withValues(alpha: 0.55),
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: cellCount,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 7,
            mainAxisSpacing: 2,
            crossAxisSpacing: 2,
            childAspectRatio: 0.85,
          ),
          itemBuilder: (context, index) {
            if (index < leading) {
              return const SizedBox.shrink();
            }
            final day = index - leading + 1;
            final date = DateTime(year, month, day);
            final isPast = date.isBefore(today);
            final isToday = isSameLocalDay(date, today);
            final hasDot = daysWithSessions.contains(day);
            final fg = isPast
                ? scheme.onSurface.withValues(alpha: 0.32)
                : scheme.onSurface;

            return Material(
              color: isToday
                  ? scheme.primary.withValues(alpha: 0.12)
                  : Colors.transparent,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: isPast ? null : () => onSelectDay(date),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '$day',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: fg,
                            fontWeight:
                                isToday ? FontWeight.w700 : FontWeight.w500,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Container(
                      width: 5,
                      height: 5,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: hasDot ? scheme.primary : Colors.transparent,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}
