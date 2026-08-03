import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/api_config.dart';
import '../../core/theme/theme_controller.dart';
import '../auth/auth_controller.dart';

/// Hub Ajustes: cuenta, sistema y sesión.
class SettingsScreen extends StatelessWidget {
  /// Crea la pantalla.
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final theme = context.watch<ThemeController>();
    final session = auth.session;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
      children: [
        Text(
          'Cuenta',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.55),
              ),
        ),
        const SizedBox(height: 8),
        Card(
          child: ListTile(
            leading: const Icon(Icons.person_outline),
            title: Text(session?.name ?? 'Afiliado'),
            subtitle: Text(
              [
                if (session?.email != null) session!.email,
                if (session?.tenantSlug != null) session!.tenantSlug,
              ].join(' · '),
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          'Sistema',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.55),
              ),
        ),
        const SizedBox(height: 8),
        Card(
          child: SwitchListTile(
            secondary: const Icon(Icons.dark_mode_outlined),
            title: const Text('Tema oscuro'),
            subtitle: Text(theme.isDark ? 'Oscuro' : 'Claro'),
            value: theme.isDark,
            onChanged: (_) => theme.toggle(),
          ),
        ),
        Card(
          child: ListTile(
            leading: const Icon(Icons.cloud_outlined),
            title: const Text('API'),
            subtitle: Text(ApiConfig.baseUrl),
          ),
        ),
        const SizedBox(height: 24),
        FilledButton.tonal(
          onPressed: () => auth.logout(),
          child: const Text('Cerrar sesión'),
        ),
      ],
    );
  }
}
