import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import 'notifications_repository.dart';

/// Bandeja in-app del socio (N1, sin push).
///
/// CU-NOT-005. Opt-out de mail: RN-NOT-005.
class NotificationsScreen extends StatefulWidget {
  /// Crea la pantalla.
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<AppNotification>? _items;
  List<NotificationEmailPref> _prefs = [];
  Object? _error;
  bool _prefLoaded = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final repo = context.read<NotificationsRepository>();
      final items = await repo.listMine();
      final prefs = await repo.listEmailPrefs();
      if (!mounted) {
        return;
      }
      setState(() {
        _items = items;
        _prefs = prefs;
        _prefLoaded = true;
      });
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
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

  Future<void> _toggleEmail(String eventCode, bool value) async {
    try {
      final pref = await context
          .read<NotificationsRepository>()
          .setEmailPref(eventCode, value);
      if (!mounted) {
        return;
      }
      setState(() {
        _prefs = [
          for (final p in _prefs)
            if (p.eventCode == pref.eventCode) pref else p,
        ];
      });
    } on ApiException catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = _items;
    final err = _error;

    return Scaffold(
      appBar: AppBar(title: const Text('Avisos')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
          children: [
            if (_prefLoaded) ...[
              Text(
                'Correo por tipo de aviso',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              ..._prefs.map(
                (p) => SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(p.label),
                  value: p.emailEnabled,
                  onChanged: (v) => _toggleEmail(p.eventCode, v),
                ),
              ),
            ],
            const SizedBox(height: 8),
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
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Text(
                  'No hay avisos todavía',
                  textAlign: TextAlign.center,
                ),
              )
            else
              ...items.map(
                (n) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(
                    n.inAppRead
                        ? Icons.mark_email_read_outlined
                        : Icons.mark_email_unread_outlined,
                  ),
                  title: Text(
                    n.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight:
                          n.inAppRead ? FontWeight.normal : FontWeight.w600,
                    ),
                  ),
                  subtitle: Text(
                    n.createdAt.toLocal().toString().split('.').first,
                  ),
                  onTap: () => _open(n),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
