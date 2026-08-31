import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import '../../core/widgets/shared_widgets.dart';
import '../cart/cart_screen.dart';
import '../store/history_screen.dart';
import 'member_session_card.dart';
import 'session_booking_mixin.dart';
import 'sessions_repository.dart';

/// Clases de un día: se abre al tocar una fecha del calendario.
class DaySessionsScreen extends StatefulWidget {
  /// Crea la pantalla del [day] local.
  const DaySessionsScreen({super.key, required this.day});

  /// Día elegido (sin hora).
  final DateTime day;

  @override
  State<DaySessionsScreen> createState() => _DaySessionsScreenState();
}

class _DaySessionsScreenState extends State<DaySessionsScreen>
    with SessionBookingMixin {
  List<MemberSession>? _sessions;
  String? _error;

  SessionsRepository get _repo => context.read<SessionsRepository>();

  DateTime get _from {
    final start = widget.day;
    final now = DateTime.now();
    if (isSameLocalDay(start, now) && now.isAfter(start)) return now;
    return start;
  }

  DateTime get _to =>
      DateTime(widget.day.year, widget.day.month, widget.day.day, 23, 59, 59, 999);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final sessions = await _repo.listSessionsInRange(from: _from, to: _to);
      if (!mounted) return;
      await loadBookingSideData();
      if (!mounted) return;
      setState(() {
        _sessions = sessions.where((s) => !s.started).toList();
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error =
            e is ApiException ? e.message : 'No se pudieron cargar las clases';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(formatDayShort(widget.day)),
        actions: const [
          CartAppBarButton(),
          HistoryAppBarButton(),
        ],
      ),
      body: _buildBody(),
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
    final sessions = _sessions;
    if (sessions == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (sessions.isEmpty) {
      return RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [
            Padding(
              padding: EdgeInsets.fromLTRB(20, 40, 20, 28),
              child: Text(
                'No hay clases este día.',
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
        itemCount: sessions.length,
        separatorBuilder: (context, index) => const SizedBox(height: 12),
        itemBuilder: (context, i) {
          final session = sessions[i];
          return MemberSessionCard(
            mode: MemberSessionCardMode.book,
            session: session,
            reservation: bookingReservationFor(session.id),
            waitlist: bookingWaitlistFor(session.id),
            hasCredits: bookingHasCredits(session.serviceId),
            mpConnected: bookingMpConnected,
            busy: bookingBusy && bookingBusySessionId == session.id,
            onReserve: () => bookingReserve(session, onDone: _load),
            onAddToCart: () => bookingAddToCart(session),
            onJoinWaitlist: () => bookingJoinWaitlist(session, onDone: _load),
            onLeaveWaitlist: () {
              final w = bookingWaitlistFor(session.id);
              if (w != null) {
                bookingLeaveWaitlist(w, onDone: _load);
              }
            },
          );
        },
      ),
    );
  }
}
