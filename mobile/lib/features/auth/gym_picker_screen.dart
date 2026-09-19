import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'auth_controller.dart';

/// Elige gym y perfil (socio / staff) de la identity.
class GymPickerScreen extends StatelessWidget {
  /// Crea el picker.
  const GymPickerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final items = auth.memberships;
    final email = auth.identity?.email ?? '';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tus gyms'),
        actions: [
          TextButton(
            onPressed: auth.busy ? null : () => auth.logout(),
            child: const Text('Salir'),
          ),
        ],
      ),
      body: items.isEmpty
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Ningún gym te dio de alta todavía. '
                  'Pedile a recepción que te cargue con este email.',
                  textAlign: TextAlign.center,
                ),
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  email,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 12),
                ...items.map(
                  (row) => Card(
                    child: ListTile(
                      title: Text(row.tenantName),
                      subtitle: Text('${row.tenantSlug} · ${row.roleLabel}'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: auth.busy
                          ? null
                          : () async {
                              final ok = await auth.enterGym(row);
                              if (!ok && context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      auth.error ?? 'No se pudo entrar',
                                    ),
                                  ),
                                );
                              }
                            },
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
