import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/api_config.dart';
import '../../core/config/chat_config.dart';
import '../../core/crash/crash_reporter.dart';
import '../../core/theme/theme_controller.dart';
import '../../core/widgets/confirm_dialog.dart';
import '../../core/widgets/loading_dialog.dart';
import '../auth/auth_controller.dart';
import '../auth/password_screen.dart';
import '../credentials/device_wallet_service.dart';
import '../notifications/notification_prefs_screen.dart';

/// Hub Ajustes: cuenta, contraseña, avisos (socio), wallet SSI, sistema y sesión.
class SettingsScreen extends StatefulWidget {
  /// Crea la pantalla.
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<AuthController>().loadPasswordStatus();
    });
  }

  void _openPassword(BuildContext context, bool hasPassword) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PasswordScreen(hasPassword: hasPassword),
      ),
    );
  }

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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('No se pudo cerrar sesión: $e')));
    }
  }

  Future<void> _resetWallet(BuildContext context) async {
    final ok = await showConfirmDialog(
      context,
      title: 'Reiniciar wallet',
      message:
          'Se borran todas las credenciales SSI de este celular. '
          'Vas a tener que volver a aceptarlas. '
          'Tu sesión de Faciliter no se cierra.',
      confirmLabel: 'Reiniciar',
      isDestructive: true,
    );
    if (!ok || !context.mounted) return;
    final wallet = context.read<DeviceWalletService>();
    try {
      await runWithLoadingDialog(
        context,
        message: 'Reiniciando wallet…',
        action: wallet.resetWallet,
      );
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Wallet reiniciada')));
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('No se pudo reiniciar: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final theme = context.watch<ThemeController>();
    final session = auth.session;
    final password = auth.passwordStatus;
    final hasPassword = password?.hasPassword ?? true;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
      children: [
        if (password?.temporary == true) ...[
          Card(
            color: Theme.of(context).colorScheme.errorContainer,
            child: ListTile(
              leading: Icon(
                Icons.warning_amber_rounded,
                color: Theme.of(context).colorScheme.onErrorContainer,
              ),
              title: Text(
                'Estás usando la contraseña inicial',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onErrorContainer,
                ),
              ),
              subtitle: Text(
                'Cambiala por una tuya.',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onErrorContainer,
                ),
              ),
              onTap: () => _openPassword(context, true),
            ),
          ),
          const SizedBox(height: 12),
        ],
        _sectionTitle(context, 'Cuenta'),
        const SizedBox(height: 8),
        Card(
          child: ListTile(
            leading: const Icon(Icons.person_outline),
            title: Text(
              session?.name ??
                  (session?.profileType == 'STAFF' ? 'Staff' : 'Afiliado'),
            ),
            subtitle: Text(
              [
                if (session?.email != null) session!.email,
                if (session?.tenantSlug != null) session!.tenantSlug,
              ].join(' · '),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Card(
          child: ListTile(
            leading: const Icon(Icons.swap_horiz),
            title: const Text('Cambiar gym'),
            subtitle: const Text('Elegí otro local o perfil'),
            onTap: () => auth.switchGym(),
          ),
        ),
        const SizedBox(height: 8),
        Card(
          child: ListTile(
            leading: const Icon(Icons.lock_outline),
            title: Text(
              hasPassword ? 'Cambiar contraseña' : 'Crear contraseña',
            ),
            subtitle: Text(
              hasPassword
                  ? 'Para entrar con tu mail'
                  : 'Entrás con Google o Apple. Sumá una contraseña.',
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _openPassword(context, hasPassword),
          ),
        ),
        if (session?.profileType == 'MEMBER') ...[
          const SizedBox(height: 20),
          _sectionTitle(context, 'Avisos'),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.notifications_outlined),
              title: const Text('Correo por tipo'),
              subtitle: const Text('Qué avisos te llegan por mail'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const NotificationPrefsScreen(),
                  ),
                );
              },
            ),
          ),
        ],
        const SizedBox(height: 20),
        _sectionTitle(context, 'Wallet SSI'),
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
        _sectionTitle(context, 'Sistema'),
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
        if (!kReleaseMode || CrashReporter.crashTestEnabled) ...[
          const SizedBox(height: 20),
          _sectionTitle(context, 'Desarrolladores'),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.cloud_outlined),
              title: const Text('API'),
              subtitle: Text(ApiConfig.baseUrl),
            ),
          ),
          if (session?.profileType == 'STAFF')
            Card(
              child: ListTile(
                leading: const Icon(Icons.chat_outlined),
                title: const Text('Chat API'),
                subtitle: Text(ChatConfig.baseUrl),
              ),
            ),
          if (CrashReporter.crashTestEnabled)
            Card(
              child: ListTile(
                leading: const Icon(Icons.bug_report_outlined),
                title: const Text('Probar Crashlytics'),
                subtitle: Text(
                  CrashReporter.enabled
                      ? 'Cierra la app con un crash de prueba'
                      : 'Crashlytics no está activo en este build',
                ),
                enabled: CrashReporter.enabled,
                onTap: CrashReporter.testCrash,
              ),
            ),
        ],
        const SizedBox(height: 24),
        FilledButton.tonal(
          onPressed: () => _logout(context),
          child: const Text('Cerrar sesión'),
        ),
      ],
    );
  }

  Widget _sectionTitle(BuildContext context, String label) {
    return Text(
      label,
      style: Theme.of(context).textTheme.titleSmall?.copyWith(
        color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55),
      ),
    );
  }
}
