import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
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
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
            child: SegmentedButton<_SessionsTab>(
              segments: const [
                ButtonSegment(
                  value: _SessionsTab.classes,
                  label: Text('Clases'),
                  icon: Icon(Icons.calendar_month_outlined),
                ),
                ButtonSegment(
                  value: _SessionsTab.reservations,
                  label: Text('Reservas'),
                  icon: Icon(Icons.event_available_outlined),
                ),
                ButtonSegment(
                  value: _SessionsTab.waitlist,
                  label: Text('Espera'),
                  icon: Icon(Icons.hourglass_top),
                ),
              ],
              selected: {_tab},
              onSelectionChanged: (selection) =>
                  setState(() => _tab = selection.first),
            ),
          ),
          Expanded(child: _buildBody()),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_error != null) {
      return _MessagePane(
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
      return const _MessagePane(
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
          _MessagePane(
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
          const _MessagePane(
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
          const _MessagePane(
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
              Icon(Icons.fitness_center_outlined, color: scheme.primary),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  session.serviceName,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _InfoLine(icon: Icons.schedule, text: _formatDateTime(session.startsAt)),
          if (session.branchName != null)
            _InfoLine(icon: Icons.place_outlined, text: session.branchName!),
          if (session.instructorName != null)
            _InfoLine(
              icon: Icons.person_outline,
              text: 'Con ${session.instructorName}',
            ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _Chip(
                icon: Icons.people_outline,
                label: session.hasSlots
                    ? '${session.slotsLeft} cupo${session.slotsLeft == 1 ? '' : 's'}'
                    : 'Llena',
                color: session.hasSlots ? scheme.primary : scheme.error,
              ),
              if (session.dropInPrice != null)
                _Chip(
                  icon: Icons.payments_outlined,
                  label: 'Drop-in \$${session.dropInPrice}',
                  color: scheme.secondary,
                ),
            ],
          ),
          const SizedBox(height: 14),
          if (isReserved)
            _ActionRow(
              label: 'Reservada',
              onPressed: busy ? null : onCancelReservation,
              buttonLabel: 'Cancelar',
            )
          else if (session.hasSlots)
            _ActionRow(
              label: null,
              onPressed: busy ? null : onReserve,
              buttonLabel: 'Reservar',
              onSecondary: session.dropInPrice != null
                  ? (busy ? null : onDropIn)
                  : null,
              secondaryLabel: session.dropInPrice != null
                  ? 'Drop-in \$${session.dropInPrice}'
                  : null,
            )
          else if (inWaitlist)
            _ActionRow(
              label: 'En espera',
              onPressed: busy ? null : onLeaveWaitlist,
              buttonLabel: 'Salir',
            )
          else
            _ActionRow(
              label: null,
              onPressed: busy ? null : onJoinWaitlist,
              buttonLabel: 'Unirme a la lista',
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
              Icon(Icons.event_available, color: scheme.primary),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  reservation.serviceName,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _InfoLine(
            icon: Icons.schedule,
            text:
                '${_formatDateTime(reservation.sessionStartsAt)} · ${reservation.coverage}',
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
              Icon(Icons.hourglass_top, color: scheme.primary),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  entry.serviceName,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _InfoLine(icon: Icons.schedule, text: _formatDateTime(entry.sessionStartsAt)),
          _InfoLine(
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

class _ActionRow extends StatelessWidget {
  const _ActionRow({
    required this.label,
    required this.onPressed,
    required this.buttonLabel,
    this.secondaryLabel,
    this.onSecondary,
  });

  final String? label;
  final VoidCallback? onPressed;
  final String buttonLabel;
  final String? secondaryLabel;
  final VoidCallback? onSecondary;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      children: [
        if (label != null)
          Expanded(
            child: Text(
              label!,
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: scheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
        if (secondaryLabel != null && onSecondary != null) ...[
          TextButton(onPressed: onSecondary, child: Text(secondaryLabel!)),
          const SizedBox(width: 8),
        ],
        FilledButton(onPressed: onPressed, child: Text(buttonLabel)),
      ],
    );
  }
}

class _InfoLine extends StatelessWidget {
  const _InfoLine({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(icon, size: 16, color: scheme.onSurface.withValues(alpha: 0.6)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: scheme.onSurface.withValues(alpha: 0.8),
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.icon, required this.label, required this.color});

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: color.withValues(alpha: 0.12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      ),
    );
  }
}

class _MessagePane extends StatelessWidget {
  const _MessagePane({
    required this.icon,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 56, color: scheme.primary),
              const SizedBox(height: 12),
              Text(
                message,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              if (actionLabel != null) ...[
                const SizedBox(height: 12),
                TextButton(onPressed: onAction, child: Text(actionLabel!)),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

String _formatDateTime(DateTime dt) {
  const months = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];
  final local = dt.toLocal();
  final day = local.day;
  final month = months[local.month - 1];
  return '$day $month · ${_two(local.hour)}:${_two(local.minute)}';
}

String _two(int n) => n.toString().padLeft(2, '0');