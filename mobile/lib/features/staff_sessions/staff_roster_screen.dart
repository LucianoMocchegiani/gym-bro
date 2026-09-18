import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import '../../core/widgets/confirm_dialog.dart';
import '../../core/widgets/loading_dialog.dart';
import 'staff_member_search_field.dart';
import 'staff_sessions_repository.dart';

/// Inscriptos de una clase: anotar con crédito / cancelar.
class StaffRosterScreen extends StatefulWidget {
  /// Crea la pantalla.
  const StaffRosterScreen({super.key, required this.session});

  final StaffSession session;

  @override
  State<StaffRosterScreen> createState() => _StaffRosterScreenState();
}

class _StaffRosterScreenState extends State<StaffRosterScreen> {
  Future<List<StaffReservation>>? _future;
  StaffMemberHit? _picked;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??=
        context.read<StaffSessionsRepository>().listRoster(widget.session.id);
  }

  Future<void> _reload() async {
    setState(() {
      _future =
          context.read<StaffSessionsRepository>().listRoster(widget.session.id);
    });
    await _future;
  }

  Future<void> _book() async {
    final member = _picked;
    if (member == null) {
      return;
    }
    final repo = context.read<StaffSessionsRepository>();
    try {
      await runWithLoadingDialog(
        context,
        message: 'Anotando…',
        action: () => repo.bookCredit(
          memberId: member.id,
          sessionId: widget.session.id,
        ),
      );
      if (!mounted) {
        return;
      }
      setState(() => _picked = null);
      await _reload();
    } catch (e) {
      if (!mounted) {
        return;
      }
      final msg = e is ApiException ? e.message : 'No se pudo anotar';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  Future<void> _cancel(StaffReservation row) async {
    final ok = await showConfirmDialog(
      context,
      title: 'Cancelar reserva',
      message: '¿Cancelar a ${row.displayName}?',
      confirmLabel: 'Cancelar reserva',
      isDestructive: true,
    );
    if (!ok || !mounted) {
      return;
    }
    try {
      await context.read<StaffSessionsRepository>().cancel(row.id);
      await _reload();
    } catch (e) {
      if (!mounted) {
        return;
      }
      final msg = e is ApiException ? e.message : 'No se pudo cancelar';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  String _hm(DateTime dt) {
    final l = dt.toLocal();
    return '${l.hour.toString().padLeft(2, '0')}:${l.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.session;
    final future = _future;
    return Scaffold(
      appBar: AppBar(
        title: Text('${_hm(s.startsAt)} ${s.serviceName}'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          Text(
            '${s.bookedCount}/${s.capacity} · Drop-in se cobra en Caja.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 16),
          StaffMemberSearchField(
            selected: _picked,
            onSelected: (m) => setState(() => _picked = m),
          ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: _picked == null ? null : _book,
            child: const Text('Anotar con crédito'),
          ),
          const SizedBox(height: 20),
          Text('Inscriptos', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (future == null)
            const Center(child: CircularProgressIndicator())
          else
            FutureBuilder<List<StaffReservation>>(
              future: future,
              builder: (context, snap) {
                if (snap.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snap.hasError) {
                  final msg = snap.error is ApiException
                      ? (snap.error! as ApiException).message
                      : 'No se pudo cargar el roster';
                  return Text(msg);
                }
                final items = snap.data ?? const <StaffReservation>[];
                if (items.isEmpty) {
                  return const Text('Nadie anotado todavía.');
                }
                return Column(
                  children: [
                    for (final r in items)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(r.displayName),
                        subtitle: Text(r.coverage),
                        trailing: TextButton(
                          onPressed: () => _cancel(r),
                          child: const Text('Cancelar'),
                        ),
                      ),
                  ],
                );
              },
            ),
        ],
      ),
    );
  }
}
