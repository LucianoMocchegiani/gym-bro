import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import 'app_update_controller.dart';

/// Antepone el chequeo de versión a [child].
///
/// - [AppUpdateStatus.required]: pantalla bloqueante con botón a la tienda.
/// - [AppUpdateStatus.suggested]: diálogo descartable, una vez por versión.
/// - Resto: muestra [child].
class AppUpdateGate extends StatefulWidget {
  /// Crea el gate.
  const AppUpdateGate({super.key, required this.child});

  /// Contenido normal de la app (p. ej. `AuthGate`).
  final Widget child;

  @override
  State<AppUpdateGate> createState() => _AppUpdateGateState();
}

class _AppUpdateGateState extends State<AppUpdateGate> {
  @override
  Widget build(BuildContext context) {
    final update = context.watch<AppUpdateController>();
    if (update.status == AppUpdateStatus.required) {
      return _RequiredUpdateScreen(storeUrl: update.storeUrl);
    }
    if (update.status == AppUpdateStatus.suggested) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _suggest(update));
    }
    return widget.child;
  }

  Future<void> _suggest(AppUpdateController update) async {
    if (!mounted || update.status != AppUpdateStatus.suggested) return;
    await update.markSuggestionShown();
    if (!mounted) return;
    final storeUrl = update.storeUrl;
    final go = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hay una versión nueva'),
        content: const Text(
          'Actualizá Faciliter para tener las últimas mejoras.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Más tarde'),
          ),
          if (storeUrl != null)
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Actualizar'),
            ),
        ],
      ),
    );
    if (go == true && storeUrl != null) await _openStore(storeUrl);
  }
}

class _RequiredUpdateScreen extends StatelessWidget {
  const _RequiredUpdateScreen({required this.storeUrl});

  final String? storeUrl;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final url = storeUrl;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Icon(
                    Icons.system_update_outlined,
                    size: 64,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Actualizá la app',
                    style: theme.textTheme.headlineSmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Esta versión de Faciliter ya no es compatible. '
                    'Instalá la última desde la tienda para seguir usándola.',
                    style: theme.textTheme.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                  if (url != null) ...[
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: () => _openStore(url),
                      child: const Text('Actualizar'),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

Future<void> _openStore(String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null) return;
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}
