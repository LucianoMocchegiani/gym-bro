import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import '../../core/widgets/gym_bro_tabs.dart';
import '../../core/widgets/shared_widgets.dart';
import '../cart/cart_screen.dart';
import '../store/history_screen.dart';
import 'day_sessions_screen.dart';
import 'member_session_card.dart';
import 'month_calendar.dart';
import 'session_booking_mixin.dart';
import 'sessions_repository.dart';

/// Sesiones del afiliado: calendario del mes + mis clases (CU-RES-001/004).
///
/// El día abre una pantalla con las cards. Con créditos reserva; si no,
/// drop-in al carrito. Mis clases une reservas y espera con la misma card.
class SessionsScreen extends StatefulWidget {
  /// Crea la pantalla.
  const SessionsScreen({super.key});

  @override
  State<SessionsScreen> createState() => _SessionsScreenState();
}

enum _SessionsTab { calendar, mine }

class _SessionsScreenState extends State<SessionsScreen>
    with SessionBookingMixin {
  _SessionsTab _tab = _SessionsTab.calendar;
  DateTime _visibleMonth = localDateOnly(DateTime.now());
  List<MemberSession>? _monthSessions;
  Map<String, MemberSession> _sessionsById = {};
  String? _error;

  SessionsRepository get _repo => context.read<SessionsRepository>();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_monthSessions == null && _error == null) {
      _load();
    }
  }

  DateTime get _monthFrom {
    final start = DateTime(_visibleMonth.year, _visibleMonth.month);
    final now = DateTime.now();
    final isCurrent =
        _visibleMonth.year == now.year && _visibleMonth.month == now.month;
    return isCurrent && now.isAfter(start) ? now : start;
  }

  DateTime get _monthTo =>
      DateTime(_visibleMonth.year, _visibleMonth.month + 1)
          .subtract(const Duration(milliseconds: 1));

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final month = await _repo.listSessionsInRange(
        from: _monthFrom,
        to: _monthTo,
      );
      if (!mounted) return;
      await loadBookingSideData();
      if (!mounted) return;
      final byId = {for (final s in month) s.id: s};
      await _hydrateMineSessions(byId);
      if (!mounted) return;
      setState(() {
        _monthSessions = month;
        _sessionsById = byId;
      });
    } catch (e) {
      if (!mounted) return;
      final message =
          e is ApiException ? e.message : 'No se pudieron cargar las sesiones';
      if (_monthSessions != null) {
        bookingSnack(message);
        return;
      }
      setState(() => _error = message);
    }
  }

  Future<void> _hydrateMineSessions(Map<String, MemberSession> byId) async {
    final missing = <DateTime>[];
    for (final r in bookingReservations) {
      if (r.status == 'CONFIRMED' && !byId.containsKey(r.sessionId)) {
        missing.add(r.sessionStartsAt);
      }
    }
    for (final w in bookingWaitlist) {
      if (w.status == 'WAITING' && !byId.containsKey(w.sessionId)) {
        missing.add(w.sessionStartsAt);
      }
    }
    if (missing.isEmpty) return;
    missing.sort();
    final extra = await _repo.listSessionsInRange(
      from: missing.first,
      to: missing.last.add(const Duration(hours: 36)),
    );
    for (final s in extra) {
      byId[s.id] = s;
    }
  }

  void _shiftMonth(int delta) {
    final next = DateTime(_visibleMonth.year, _visibleMonth.month + delta);
    final now = DateTime.now();
    final current = DateTime(now.year, now.month);
    if (next.isBefore(current)) return;
    setState(() {
      _visibleMonth = DateTime(next.year, next.month);
      _monthSessions = null;
    });
    _load();
  }

  Future<void> _openDay(DateTime day) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => DaySessionsScreen(day: day),
      ),
    );
    if (mounted) await _load();
  }

  Set<int> get _daysWithSessions {
    final sessions = _monthSessions ?? const <MemberSession>[];
    return {
      for (final s in sessions)
        if (!s.started &&
            s.startsAt.toLocal().year == _visibleMonth.year &&
            s.startsAt.toLocal().month == _visibleMonth.month)
          s.startsAt.toLocal().day,
    };
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sesiones'),
        actions: const [
          CartAppBarButton(),
          HistoryAppBarButton(),
        ],
      ),
      body: Column(
        children: [
          GymBroTabs(
            tabs: const [
              GymBroTab(label: 'Calendario', icon: Icons.calendar_month_outlined),
              GymBroTab(label: 'Mis clases', icon: Icons.event_available_outlined),
            ],
            selectedIndex: _tab.index,
            onChanged: (i) => setState(() => _tab = _SessionsTab.values[i]),
          ),
          Expanded(child: _buildBody()),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_error != null) {
      return GymBroMessagePane(
        icon: Icons.error_outline,
        message: _error!,
        actionLabel: 'Reintentar',
        onAction: _load,
      );
    }
    if (_monthSessions == null) {
      return const Center(child: CircularProgressIndicator());
    }
    return switch (_tab) {
      _SessionsTab.calendar => _buildCalendar(),
      _SessionsTab.mine => _buildMine(),
    };
  }

  Widget _buildCalendar() {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 28),
        children: [
          MonthCalendar(
            visibleMonth: _visibleMonth,
            daysWithSessions: _daysWithSessions,
            onPrevMonth: () => _shiftMonth(-1),
            onNextMonth: () => _shiftMonth(1),
            onSelectDay: _openDay,
          ),
          const SizedBox(height: 16),
          Text(
            'Tocá un día para ver las clases.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.6),
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildMine() {
    final mine = <_MineRow>[];
    for (final r in bookingReservations) {
      if (r.status != 'CONFIRMED') continue;
      mine.add(_MineRow.reservation(r));
    }
    for (final w in bookingWaitlist) {
      if (w.status != 'WAITING') continue;
      mine.add(_MineRow.waitlist(w));
    }
    mine.sort((a, b) => a.startsAt.compareTo(b.startsAt));

    return RefreshIndicator(
      onRefresh: _load,
      child: mine.isEmpty
          ? ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                Padding(
                  padding: EdgeInsets.fromLTRB(20, 40, 20, 28),
                  child: Text(
                    'Todavía no tenés clases reservadas ni en espera.',
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            )
          : ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
              itemCount: mine.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, i) {
                final row = mine[i];
                final sessionId =
                    row.reservation?.sessionId ?? row.waitlist!.sessionId;
                final session = _sessionsById[sessionId];
                return MemberSessionCard(
                  mode: MemberSessionCardMode.mine,
                  session: session,
                  reservation: row.reservation,
                  waitlist: row.waitlist,
                  busy: bookingBusy,
                  onCancelReservation: row.reservation != null
                      ? () => bookingCancelReservation(
                            row.reservation!,
                            onDone: _load,
                          )
                      : null,
                  onLeaveWaitlist: row.waitlist != null
                      ? () => bookingLeaveWaitlist(
                            row.waitlist!,
                            onDone: _load,
                          )
                      : null,
                );
              },
            ),
    );
  }
}

class _MineRow {
  _MineRow._({
    required this.startsAt,
    this.reservation,
    this.waitlist,
  });

  factory _MineRow.reservation(MemberReservation r) => _MineRow._(
        startsAt: r.sessionStartsAt,
        reservation: r,
      );

  factory _MineRow.waitlist(WaitlistEntry w) => _MineRow._(
        startsAt: w.sessionStartsAt,
        waitlist: w,
      );

  final DateTime startsAt;
  final MemberReservation? reservation;
  final WaitlistEntry? waitlist;
}
