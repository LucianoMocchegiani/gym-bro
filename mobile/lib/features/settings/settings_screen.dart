import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/api_config.dart';
import '../../core/theme/theme_controller.dart';
import '../../core/widgets/confirm_dialog.dart';
import '../../core/widgets/loading_dialog.dart';
import '../auth/auth_controller.dart';
import '../credentials/member_wallet_service.dart';

/// Hub Ajustes: cuenta, wallet SSI, sistema y sesión.
class SettingsScreen extends StatelessWidget {
  /// Crea la pantalla.
  const SettingsScreen({super.key});

  Future<void> _logout(BuildContext context) async {
    final ok = await showConfirmDialog(
      context,
      title: 'Cerrar sesión',
      message: '¿Querés salir de tu cuenta en este celular?',
      confirmLabel: 'Cerrar sesión',
      isDestructive: true,
    );
    if (!ok || !context.mounted) return;
    final auth = context.read<AuthController>();
    try {
      await runWithLoadingDialog(
        context,
        message: 'Cerrando sesión…',
        action: auth.logout,
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo cerrar sesión: $e')),
      );
    }
  }

  Future<void> _resetWallet(BuildContext context) async {
    final ok = await showConfirmDialog(
      context,
      title: 'Reiniciar wallet',
      message:
          'Se borran todas las credenciales SSI de este celular. '
          'Vas a tener que volver a aceptarlas. '
          'Tu sesión de GymBro no se cierra.',
      confirmLabel: 'Reiniciar',
      isDestructive: true,
    );
    if (!ok || !context.mounted) return;
    final wallet = context.read<MemberWalletService>();
    try {
      await runWithLoadingDialog(
        context,
        message: 'Reiniciando wallet…',
        action: wallet.resetWallet,
      );
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Wallet reiniciada')),
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo reiniciar: $e')),
      );
    }
  }

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
          'Wallet SSI',
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
            leading: Icon(
              Icons.restart_alt,
              color: Theme.of(context).colorScheme.error,
            ),
            title: const Text('Reiniciar wallet'),
            subtitle: const Text(
              'Borra todas las credenciales de este celular',
            ),
            onTap: () => _resetWallet(context),
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
          onPressed: () => _logout(context),
          child: const Text('Cerrar sesión'),
        ),
      ],
    );
  }
}
