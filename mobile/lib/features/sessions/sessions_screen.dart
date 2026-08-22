import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import '../../core/widgets/gym_bro_tabs.dart';
import '../../core/widgets/shared_widgets.dart';
import 'sessions_repository.dart';

/// Slice sesiones + reservas + waitlist del afiliado (E9).
///
/// Pestañas: Clases (catálogo publicado), Mis reservas y Lista de espera.
class SessionsScreen extends StatefulWidget {
  /// Crea la pantalla.
  const SessionsScreen({super.key});

  @override
  State<SessionsScreen> createState() => _SessionsScreenState();
}

enum _SessionsTab { classes, reservations, waitlist }

class _SessionsScreenState extends State<SessionsScreen> {
  _SessionsTab _tab = _SessionsTab.classes;
  List<MemberSession>? _sessions;
  List<MemberReservation>? _reservations;
  List<WaitlistEntry>? _waitlist;
  String? _error;
  bool _busy = false;
  String? _busySessionId;

  SessionsRepository get _repo => context.read<SessionsRepository>();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_sessions == null && _error == null) {
      _load();
    }
  }

  Future<void> _load() async {
    setState(() {
      _error = null;
    });
    try {
      final results = await Future.wait([
        _repo.listSessions(),
        _repo.listReservations(),
        _repo.listWaitlist(),
      ]);
      if (!mounted) return;
      final sessions = (results[0] as SessionPage).items;
      setState(() {
        _sessions = sessions.where((s) => !s.started).toList();
        _reservations = results[1] as List<MemberReservation>;
        _waitlist = results[2] as List<WaitlistEntry>;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e is ApiException ? e.message : 'No se pudieron cargar las sesiones';
      });
    }
  }

  Future<void> _run(
    String? sessionId,
    Future<void> Function() action,
  ) async {
    setState(() {
      _busy = true;
      _busySessionId = sessionId;
    });
    try {
      await action();
      if (!mounted) return;
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      _snack(e.message);
    } catch (_) {
      if (!mounted) return;
      _snack('Algo salió mal, intentá de nuevo');
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _busySessionId = null;
        });
      }
    }
  }

  Future<void> _reserve(MemberSession session) async {
    await _run(session.id, () async {
      try {
        await _repo.reserve(session.id);
        if (mounted) _snack('Reserva confirmada');
      } on ApiException catch (e) {
        if (e.message.toLowerCase().contains('credit') &&
            session.dropInPrice != null) {
          final ok = await _confirmDropIn(session);
          if (ok == true && mounted) {
            await _startDropIn(session);
          }
          return;
        }
        rethrow;
      }
    });
  }

  Future<bool?> _confirmDropIn(MemberSession session) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sin créditos disponibles'),
        content: Text(
          'No tenés créditos para ${session.serviceName}. '
          '¿Querés pagar el drop-in por \$${session.dropInPrice}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Pagar drop-in'),
          ),
        ],
      ),
    );
  }

  Future<void> _startDropIn(MemberSession session) async {
    await _run(session.id, () async {
      final checkout = await _repo.startDropIn(session.id);
      if (!mounted) return;
      final url = checkout.checkoutUrl;
      if (url == null || url.isEmpty) {
        _snack('El pago no está disponible en este momento');
        return;
      }
      await _showCheckoutLink(url, session.serviceName);
    });
  }

  Future<void> _showCheckoutLink(String url, String serviceName) async {
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Drop-in $serviceName'),
        content: SelectableText(url),
        actions: [
          TextButton(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: url));
              if (context.mounted) {
                Navigator.pop(context);
                _snack('Link copiado. Abrílo en tu navegador para pagar');
              }
            },
            child: const Text('Copiar link'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Listo'),
          ),
        ],
      ),
    );
  }

  Future<void> _cancelReservation(MemberReservation r) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancelar reserva'),
        content: const Text('¿Querés liberar este cupo?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('No'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Cancelar reserva'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    await _run(null, () async {
      await _repo.cancelReservation(r.id);
      if (mounted) _snack('Reserva cancelada');
    });
  }

  Future<void> _joinWaitlist(MemberSession session) async {
    await _run(session.id, () async {
      await _repo.joinWaitlist(session.id);
      if (mounted) _snack('Estás en la lista de espera');
    });
  }

  Future<void> _leaveWaitlist(WaitlistEntry entry) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Salir de la lista'),
        content: const Text('¿Querés liberar tu lugar en la espera?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('No'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Salir'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    await _run(null, () async {
      await _repo.leaveWaitlist(entry.id);
      if (mounted) _snack('Saliste de la lista de espera');
    });
  }

  void _snack(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sesiones')),
      body: Column(
        children: [
          GymBroTabs(
            tabs: const [
              GymBroTab(label: 'Clases', icon: Icons.calendar_month_outlined),
              GymBroTab(label: 'Reservas', icon: Icons.event_available_outlined),
              GymBroTab(label: 'Espera', icon: Icons.hourglass_top),
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
    final sessions = _sessions;
    if (sessions == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (sessions.isEmpty &&
        (_reservations?.isEmpty ?? true) &&
        (_waitlist?.isEmpty ?? true)) {
      return const GymBroMessagePane(
        icon: Icons.calendar_month_outlined,
        message: 'Todavía no hay sesiones publicadas.',
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: switch (_tab) {
        _SessionsTab.classes => _buildClasses(sessions),
        _SessionsTab.reservations => _buildReservations(),
        _SessionsTab.waitlist => _buildWaitlist(),
      },
    );
  }

  Widget _buildClasses(List<MemberSession> sessions) {
    if (sessions.isEmpty) {
      return ListView(
        children: const [
          GymBroMessagePane(
            icon: Icons.event_note,
            message: 'No hay clases próximas por ahora.',
          ),
        ],
      );
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
      children: [
        for (var i = 0; i < sessions.length; i++) ...[
          if (i > 0) const SizedBox(height: 12),
          _SessionCard(
            session: sessions[i],
            busy: _busy && _busySessionId == sessions[i].id,
            reservation: _reservationFor(sessions[i].id),
            waitlistEntry: _waitlistFor(sessions[i].id),
            onReserve: () => _reserve(sessions[i]),
            onDropIn: () => _startDropIn(sessions[i]),
            onCancelReservation: () =>
                _cancelReservation(_reservationFor(sessions[i].id)!),
            onJoinWaitlist: () => _joinWaitlist(sessions[i]),
            onLeaveWaitlist: () =>
                _leaveWaitlist(_waitlistFor(sessions[i].id)!),
          ),
        ],
      ],
    );
  }

  MemberReservation? _reservationFor(String sessionId) {
    final reservations = _reservations;
    if (reservations == null) return null;
    for (final r in reservations) {
      if (r.sessionId == sessionId && r.status == 'CONFIRMED') return r;
    }
    return null;
  }

  WaitlistEntry? _waitlistFor(String sessionId) {
    final entries = _waitlist;
    if (entries == null) return null;
    for (final w in entries) {
      if (w.sessionId == sessionId && w.status == 'WAITING') return w;
    }
    return null;
  }

  Widget _buildReservations() {
    final reservations = _reservations ?? const <MemberReservation>[];
    final confirmed =
        reservations.where((r) => r.status == 'CONFIRMED').toList()
          ..sort((a, b) => a.sessionStartsAt.compareTo(b.sessionStartsAt));
    if (confirmed.isEmpty) {
      return ListView(
        children: [
          const GymBroMessagePane(
            icon: Icons.event_available,
            message: 'Todavía no tenés reservas confirmadas.',
          ),
        ],
      );
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
      children: [
        for (var i = 0; i < confirmed.length; i++) ...[
          if (i > 0) const SizedBox(height: 12),
          _ReservationCard(
            reservation: confirmed[i],
            busy: _busy,
            onCancel: () => _cancelReservation(confirmed[i]),
          ),
        ],
      ],
    );
  }

  Widget _buildWaitlist() {
    final entries = _waitlist ?? const <WaitlistEntry>[];
    final waiting = entries.where((w) => w.status == 'WAITING').toList()
      ..sort((a, b) => a.sessionStartsAt.compareTo(b.sessionStartsAt));
    if (waiting.isEmpty) {
      return ListView(
        children: [
          const GymBroMessagePane(
            icon: Icons.hourglass_top,
            message: 'No estás en ninguna lista de espera.',
          ),
        ],
      );
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
      children: [
        for (var i = 0; i < waiting.length; i++) ...[
          if (i > 0) const SizedBox(height: 12),
          _WaitlistCard(
            entry: waiting[i],
            busy: _busy,
            onLeave: () => _leaveWaitlist(waiting[i]),
          ),
        ],
      ],
    );
  }
}

class _SessionCard extends StatelessWidget {
  const _SessionCard({
    required this.session,
    required this.busy,
    required this.reservation,
    required this.waitlistEntry,
    required this.onReserve,
    required this.onDropIn,
    required this.onCancelReservation,
    required this.onJoinWaitlist,
    required this.onLeaveWaitlist,
  });

  final MemberSession session;
  final bool busy;
  final MemberReservation? reservation;
  final WaitlistEntry? waitlistEntry;
  final VoidCallback onReserve;
  final VoidCallback onDropIn;
  final VoidCallback onCancelReservation;
  final VoidCallback onJoinWaitlist;
  final VoidCallback onLeaveWaitlist;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isReserved = reservation != null;
    final inWaitlist = waitlistEntry != null;

    final String statusLabel;
    final Color statusColor;
    if (isReserved) {
      statusLabel = 'Reservada';
      statusColor = scheme.primary;
    } else if (inWaitlist) {
      statusLabel = 'En espera';
      statusColor = scheme.secondary;
    } else if (session.hasSlots) {
      statusLabel = '${session.slotsLeft} cupo${session.slotsLeft == 1 ? '' : 's'}';
      statusColor = scheme.primary;
    } else {
      statusLabel = 'Llena';
      statusColor = scheme.error;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scheme.outline.withValues(alpha: 0.5)),
        color: scheme.surface,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  session.serviceName,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              GymBroBadge(label: statusLabel, color: statusColor),
            ],
          ),
          const SizedBox(height: 8),
          GymBroInfoLine(icon: Icons.schedule, text: formatDateTimeShort(session.startsAt)),
          if (session.branchName != null)
            GymBroInfoLine(icon: Icons.place_outlined, text: session.branchName!),
          if (session.instructorName != null)
            GymBroInfoLine(
              icon: Icons.person_outline,
              text: 'Con ${session.instructorName}',
            ),
          if (session.dropInPrice != null) ...[
            const SizedBox(height: 4),
            GymBroInfoLine(
              icon: Icons.payments_outlined,
              text: 'Drop-in \$${session.dropInPrice}',
            ),
          ],
          const SizedBox(height: 14),
          if (isReserved)
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: busy ? null : onCancelReservation,
                child: busy
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Cancelar reserva'),
              ),
            )
          else if (session.hasSlots) ...[
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: busy ? null : onReserve,
                child: busy
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Reservar'),
              ),
            ),
            if (session.dropInPrice != null) ...[
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: busy ? null : onDropIn,
                  child: const Text('Drop-in'),
                ),
              ),
            ],
          ] else if (inWaitlist)
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: busy ? null : onLeaveWaitlist,
                child: busy
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Salir de la lista'),
              ),
            )
          else
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: busy ? null : onJoinWaitlist,
                child: busy
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Unirme a la lista'),
              ),
            ),
        ],
      ),
    );
  }
}

class _ReservationCard extends StatelessWidget {
  const _ReservationCard({
    required this.reservation,
    required this.busy,
    required this.onCancel,
  });

  final MemberReservation reservation;
  final bool busy;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scheme.outline.withValues(alpha: 0.5)),
        color: scheme.surface,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  reservation.serviceName,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              GymBroBadge(label: 'Reservada', color: scheme.primary),
            ],
          ),
          const SizedBox(height: 8),
          GymBroInfoLine(
            icon: Icons.schedule,
            text:
                '${formatDateTimeShort(reservation.sessionStartsAt)} · ${reservation.coverage}',
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton.tonal(
              onPressed: busy ? null : onCancel,
              child: const Text('Cancelar reserva'),
            ),
          ),
        ],
      ),
    );
  }
}

class _WaitlistCard extends StatelessWidget {
  const _WaitlistCard({
    required this.entry,
    required this.busy,
    required this.onLeave,
  });

  final WaitlistEntry entry;
  final bool busy;
  final VoidCallback onLeave;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scheme.outline.withValues(alpha: 0.5)),
        color: scheme.surface,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  entry.serviceName,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              GymBroBadge(
                label: entry.position != null ? '#${entry.position}' : 'En espera',
                color: scheme.secondary,
              ),
            ],
          ),
          const SizedBox(height: 8),
          GymBroInfoLine(icon: Icons.schedule, text: formatDateTimeShort(entry.sessionStartsAt)),
          GymBroInfoLine(
            icon: Icons.format_list_numbered,
            text: entry.position != null
                ? 'Puesto ${entry.position} en la fila'
                : 'En la fila',
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton.tonal(
              onPressed: busy ? null : onLeave,
              child: const Text('Salir de la lista'),
            ),
          ),
        ],
      ),
    );
  }
}

