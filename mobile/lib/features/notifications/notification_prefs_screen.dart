import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import 'notifications_repository.dart';

/// Opt-out de email por evento (CU-NOT-003 / RN-NOT-005).
class NotificationPrefsScreen extends StatefulWidget {
  /// Crea la pantalla.
  const NotificationPrefsScreen({super.key});

  @override
  State<NotificationPrefsScreen> createState() =>
      _NotificationPrefsScreenState();
}

class _NotificationPrefsScreenState extends State<NotificationPrefsScreen> {
  List<NotificationEmailPref>? _prefs;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final prefs = await context
          .read<NotificationsRepository>()
          .listEmailPrefs();
      if (!mounted) {
        return;
      }
      setState(() => _prefs = prefs);
    } catch (e) {
      if (!mounted) {
        return;
      }
      setState(() => _error = e);
    }
  }

  Future<void> _toggle(String eventCode, bool value) async {
    try {
      final pref = await context.read<NotificationsRepository>().setEmailPref(
        eventCode,
        value,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _prefs = [
          for (final p in _prefs ?? <NotificationEmailPref>[])
            if (p.eventCode == pref.eventCode) pref else p,
        ];
      });
    } on ApiException catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final prefs = _prefs;
    final err = _error;

    return Scaffold(
      appBar: AppBar(title: const Text('Avisos')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
          children: [
            Text(
              'Correo por tipo de aviso. La bandeja de la app no se apaga.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
            const SizedBox(height: 12),
            if (err != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Text(
                  err is ApiException ? err.message : 'No se pudieron cargar',
                  textAlign: TextAlign.center,
                ),
              )
            else if (prefs == null)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Center(child: CircularProgressIndicator()),
              )
            else
              ...prefs.map(
                (p) => SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(p.label),
                  value: p.emailEnabled,
                  onChanged: (v) => _toggle(p.eventCode, v),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
