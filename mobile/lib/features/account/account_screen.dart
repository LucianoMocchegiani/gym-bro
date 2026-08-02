import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/api_config.dart';
import '../../core/theme/theme_controller.dart';
import '../auth/auth_controller.dart';

/// Cuenta: tema, API, logout.
class AccountScreen extends StatelessWidget {
  /// Crea la pantalla.
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final theme = context.watch<ThemeController>();
    final session = auth.session;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Cuenta', style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 16),
        Card(
          child: ListTile(
            title: Text(session?.name ?? 'Afiliado'),
            subtitle: Text(session?.email ?? ''),
          ),
        ),
        Card(
          child: SwitchListTile(
            title: const Text('Tema oscuro'),
            subtitle: Text(theme.isDark ? 'Oscuro' : 'Claro'),
            value: theme.isDark,
            onChanged: (_) => theme.toggle(),
          ),
        ),
        Card(
          child: ListTile(
            title: const Text('API'),
            subtitle: Text(ApiConfig.baseUrl),
          ),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: () => auth.logout(),
          child: const Text('Salir'),
        ),
      ],
    );
  }
}
