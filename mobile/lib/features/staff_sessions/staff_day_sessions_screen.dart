import 'package:flutter/material.dart';

import '../../core/widgets/shared_widgets.dart';
import 'staff_roster_screen.dart';
import 'staff_sessions_repository.dart';

/// Clases de un día (paso intermedio al roster).
class StaffDaySessionsScreen extends StatelessWidget {
  /// Crea la pantalla.
  const StaffDaySessionsScreen({
    super.key,
    required this.day,
    required this.sessions,
  });

  final DateTime day;
  final List<StaffSession> sessions;

  String _hm(DateTime dt) {
    final l = dt.toLocal();
    final h = l.hour.toString().padLeft(2, '0');
    final m = l.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  @override
  Widget build(BuildContext context) {
    final sorted = [...sessions]
      ..sort((a, b) => a.startsAt.compareTo(b.startsAt));
    final title =
        '${day.day.toString().padLeft(2, '0')}/${day.month.toString().padLeft(2, '0')}';

    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: sorted.isEmpty
          ? const GymBroMessagePane(
              icon: Icons.event_busy_outlined,
              message: 'No hay clases este día.',
            )
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
              itemCount: sorted.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final s = sorted[i];
                return Card(
                  child: ListTile(
                    title: Text('${_hm(s.startsAt)}  ${s.serviceName}'),
                    subtitle: Text(
                      '${s.bookedCount}/${s.capacity}'
                      '${s.instructorName != null ? ' · ${s.instructorName}' : ''}',
                    ),
                    trailing: const Text('Entrar'),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => StaffRosterScreen(session: s),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
    );
  }
}
