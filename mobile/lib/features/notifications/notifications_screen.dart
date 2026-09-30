import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import 'notifications_repository.dart';

/// Bandeja in-app del socio (N1, sin push).
///
/// CU-NOT-005. Opt-out de mail: Ajustes → Avisos.
class NotificationsScreen extends StatefulWidget {
  /// Crea la pantalla.
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<AppNotification>? _items;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final items = await context.read<NotificationsRepository>().listMine();
      if (!mounted) {
        return;
      }
      setState(() => _items = items);
    } catch (e) {
      if (!mounted) {
        return;
      }
      setState(() => _error = e);
    }
  }

  Future<void> _open(AppNotification n) async {
    if (!n.inAppRead) {
      try {
        await context.read<NotificationsRepository>().markRead(n.id);
      } on ApiException catch (e) {
        if (!mounted) {
          return;
        }
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
        return;
      }
    }
    if (!mounted) {
      return;
    }
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(n.title),
        content: Text(n.body),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
    await _load();
  }

  String _when(DateTime at) {
    final l = at.toLocal();
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(l.day)}/${two(l.month)} ${two(l.hour)}:${two(l.minute)}';
  }

  @override
  Widget build(BuildContext context) {
    final items = _items;
    final err = _error;
    final unread = items?.where((n) => !n.inAppRead).toList() ?? [];
    final read = items?.where((n) => n.inAppRead).toList() ?? [];

    return Scaffold(
      appBar: AppBar(title: const Text('Avisos')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
          children: [
            if (err != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Text(
                  err is ApiException ? err.message : 'No se pudieron cargar',
                  textAlign: TextAlign.center,
                ),
              )
            else if (items == null)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (items.isEmpty)
              const _EmptyInbox()
            else ...[
              if (unread.isNotEmpty) ...[
                _SectionLabel(text: 'Nuevos'),
                ...unread.map(
                  (n) => _NoticeTile(
                    notice: n,
                    when: _when(n.createdAt),
                    onTap: () => _open(n),
                  ),
                ),
              ],
              if (read.isNotEmpty) ...[
                _SectionLabel(text: unread.isEmpty ? 'Bandeja' : 'Anteriores'),
                ...read.map(
                  (n) => _NoticeTile(
                    notice: n,
                    when: _when(n.createdAt),
                    onTap: () => _open(n),
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 12, bottom: 4),
      child: Text(text, style: Theme.of(context).textTheme.titleSmall),
    );
  }
}

class _NoticeTile extends StatelessWidget {
  const _NoticeTile({
    required this.notice,
    required this.when,
    required this.onTap,
  });

  final AppNotification notice;
  final String when;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final unread = !notice.inAppRead;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(
        unread
            ? Icons.mark_email_unread_outlined
            : Icons.mark_email_read_outlined,
      ),
      title: Text(
        notice.title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontWeight: unread ? FontWeight.w600 : FontWeight.normal,
        ),
      ),
      subtitle: Text(when, maxLines: 1, overflow: TextOverflow.ellipsis),
      onTap: onTap,
    );
  }
}

/// Vacío: aún no hubo envíos para este socio.
class _EmptyInbox extends StatelessWidget {
  const _EmptyInbox();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 12),
      child: Column(
        children: [
          Icon(
            Icons.notifications_none_outlined,
            size: 48,
            color: scheme.primary,
          ),
          const SizedBox(height: 12),
          Text(
            'Todavía no hay avisos',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 6),
          Text(
            'Cuando se acredite un pago, se confirme una reserva o venza un pack, va a aparecer acá. El correo se configura en Ajustes → Avisos.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: scheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
        ],
      ),
    );
  }
}
