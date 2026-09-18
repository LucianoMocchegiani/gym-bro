import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import '../../core/widgets/shared_widgets.dart';
import '../sessions/month_calendar.dart';
import 'staff_day_sessions_screen.dart';
import 'staff_sessions_repository.dart';

/// Calendario mensual de clases (mismo widget que el socio).
class StaffCalendarScreen extends StatefulWidget {
  /// Crea la pantalla.
  const StaffCalendarScreen({super.key});

  @override
  State<StaffCalendarScreen> createState() => _StaffCalendarScreenState();
}

class _StaffCalendarScreenState extends State<StaffCalendarScreen> {
  DateTime _visibleMonth = localDateOnly(DateTime.now());
  List<StaffSession>? _monthSessions;
  String? _error;

  DateTime get _monthFrom {
    final start = DateTime(_visibleMonth.year, _visibleMonth.month);
    final now = DateTime.now();
    final isCurrent =
        _visibleMonth.year == now.year && _visibleMonth.month == now.month;
    return isCurrent && now.isAfter(start) ? now : start;
  }

  DateTime get _monthTo => DateTime(_visibleMonth.year, _visibleMonth.month + 1)
      .subtract(const Duration(milliseconds: 1));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_monthSessions == null && _error == null) {
      _load();
    }
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final month = await context.read<StaffSessionsRepository>().listPublished(
            from: _monthFrom,
            to: _monthTo,
          );
      if (!mounted) {
        return;
      }
      setState(() => _monthSessions = month);
    } catch (e) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = e is ApiException ? e.message : 'No se pudieron cargar las sesiones';
      });
    }
  }

  void _shiftMonth(int delta) {
    final next = DateTime(_visibleMonth.year, _visibleMonth.month + delta);
    final now = DateTime.now();
    final current = DateTime(now.year, now.month);
    if (next.isBefore(current)) {
      return;
    }
    setState(() {
      _visibleMonth = DateTime(next.year, next.month);
      _monthSessions = null;
      _error = null;
    });
    _load();
  }

  Set<int> get _daysWithSessions {
    final days = <int>{};
    for (final s in _monthSessions ?? const <StaffSession>[]) {
      final local = s.startsAt.toLocal();
      if (local.year == _visibleMonth.year &&
          local.month == _visibleMonth.month) {
        days.add(local.day);
      }
    }
    return days;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sesiones')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
          children: [
            if (_error != null) ...[
              Text(_error!),
              TextButton(onPressed: _load, child: const Text('Reintentar')),
            ]
            else if (_monthSessions == null)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: Center(child: CircularProgressIndicator()),
              )
            else
              MonthCalendar(
                visibleMonth: _visibleMonth,
                daysWithSessions: _daysWithSessions,
                onPrevMonth: () => _shiftMonth(-1),
                onNextMonth: () => _shiftMonth(1),
                onSelectDay: (day) {
                  final ofDay = (_monthSessions ?? const <StaffSession>[])
                      .where((s) => isSameLocalDay(s.startsAt, day))
                      .toList();
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => StaffDaySessionsScreen(
                        day: day,
                        sessions: ofDay,
                      ),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
