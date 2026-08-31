import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import '../account/account_repository.dart';
import '../auth/auth_controller.dart';
import '../sessions/sessions_screen.dart';
import '../store/store_screen.dart';

/// Hub Inicio: saludo, estado breve y atajos (Sesiones / Tienda).
class HomeScreen extends StatefulWidget {
  /// Crea la pantalla.
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Future<MemberAccount>? _future;
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_started) {
      _started = true;
      _future = context.read<AccountRepository>().fetchMine();
    }
  }

  Future<void> _reload() async {
    setState(() {
      _future = context.read<AccountRepository>().fetchMine();
    });
    await _future;
  }

  void _open(Widget page) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => page),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthController>().session;
    final hello = session?.name?.trim().isNotEmpty == true
        ? session!.name!
        : (session?.email ?? 'afiliado');
    final scheme = Theme.of(context).colorScheme;
    final future = _future;

    return RefreshIndicator(
      onRefresh: _reload,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
        children: [
          Text(
            'Hola,',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: scheme.onSurface.withValues(alpha: 0.55),
                ),
          ),
          Text(
            hello,
            style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                  letterSpacing: 0.2,
                ),
          ),
          const SizedBox(height: 20),
          if (future == null)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Center(child: CircularProgressIndicator()),
            )
          else
            FutureBuilder<MemberAccount>(
              future: future,
              builder: (context, snap) {
                if (snap.connectionState != ConnectionState.done) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 40),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                if (snap.hasError) {
                  final msg = snap.error is ApiException
                      ? (snap.error! as ApiException).message
                      : 'No se pudo cargar la cuenta';
                  return _ErrorBanner(message: msg, onRetry: _reload);
                }
                final account = snap.data!;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _ContractedPacks(account: account),
                    const SizedBox(height: 28),
                    Text(
                      'Ir a',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _HubTile(
                            icon: Icons.calendar_today_outlined,
                            label: 'Sesiones',
                            subtitle: 'Reservas',
                            onTap: () => _open(const SessionsScreen()),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _HubTile(
                            icon: Icons.storefront_outlined,
                            label: 'Tienda',
                            subtitle: 'Catálogo',
                            onTap: () => _open(const StoreScreen()),
                          ),
                        ),
                      ],
                    ),
                    if (account.reservations.isNotEmpty) ...[
                      const SizedBox(height: 28),
                      Text(
                        'Próximas',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      ...account.reservations.take(3).map(
                            (r) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                contentPadding: EdgeInsets.zero,
                                leading: Icon(
                                  Icons.event_available,
                                  color: scheme.primary,
                                ),
                                title: Text(r.serviceName),
                                subtitle: Text(
                                  r.startsAt
                                      .toLocal()
                                      .toString()
                                      .substring(0, 16),
                                ),
                                trailing: Text(
                                  r.status,
                                  style: Theme.of(context).textTheme.labelSmall,
                                ),
                              ),
                            ),
                          ),
                    ],
                  ],
                );
              },
            ),
        ],
      ),
    );
  }
}

class _ContractedPacks extends StatelessWidget {
  const _ContractedPacks({required this.account});

  final MemberAccount account;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final packs = account.activeContracts;
    final alDia = account.debtStatus == 'AL_DIA';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Packs vigentes',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        if (!alDia) ...[
          const SizedBox(height: 6),
          Text(
            'Deuda: \$${account.debtAmount}',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: scheme.error,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
        const SizedBox(height: 12),
        if (packs.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: scheme.outline.withValues(alpha: 0.5)),
              color: scheme.surface,
            ),
            child: Text(
              'No tenés packs vigentes hoy. Mirà la Tienda para contratar.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          )
        else
          for (var i = 0; i < packs.length; i++) ...[
            if (i > 0) const SizedBox(height: 10),
            _PackCard(contract: packs[i]),
          ],
      ],
    );
  }
}

class _PackCard extends StatelessWidget {
  const _PackCard({required this.contract});

  final AccountContract contract;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final ends = contract.endsAt;
    final endsLabel = ends == null
        ? null
        : 'Hasta ${ends.toLocal().toIso8601String().split('T').first}';

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            scheme.primary.withValues(alpha: 0.16),
            scheme.surface,
          ],
        ),
        border: Border.all(color: scheme.outline.withValues(alpha: 0.45)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            contract.packName,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          if (endsLabel != null) ...[
            const SizedBox(height: 4),
            Text(
              endsLabel,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurface.withValues(alpha: 0.55),
                  ),
            ),
          ],
          const SizedBox(height: 12),
          ..._serviceLines(context),
        ],
      ),
    );
  }

  List<Widget> _serviceLines(BuildContext context) {
    final lines = <Widget>[];
    if (contract.hasAccessLibre) {
      lines.add(
        const _ServiceRow(
          icon: Icons.fitness_center_outlined,
          title: 'Acceso libre',
          detail: 'Sin límite de sesiones',
        ),
      );
    }
    for (final b in contract.creditBalances) {
      if (lines.isNotEmpty) {
        lines.add(const SizedBox(height: 8));
      }
      lines.add(
        _ServiceRow(
          icon: Icons.event_available_outlined,
          title: b.serviceName,
          detail: b.remaining == 1
              ? '1 sesión disponible'
              : '${b.remaining} sesiones disponibles',
        ),
      );
    }
    if (lines.isEmpty) {
      lines.add(
        Text(
          'Sin servicios detallados en este pack.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      );
    }
    return lines;
  }
}

class _ServiceRow extends StatelessWidget {
  const _ServiceRow({
    required this.icon,
    required this.title,
    required this.detail,
  });

  final IconData icon;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: scheme.primary),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.titleSmall,
              ),
              Text(
                detail,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: scheme.onSurface.withValues(alpha: 0.6),
                    ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _HubTile extends StatelessWidget {
  const _HubTile({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: scheme.outline.withValues(alpha: 0.55)),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 16, 14, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon, size: 28, color: scheme.primary),
                const SizedBox(height: 12),
                Text(
                  label,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.onSurface.withValues(alpha: 0.55),
                      ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(message),
            TextButton(onPressed: onRetry, child: const Text('Reintentar')),
          ],
        ),
      ),
    );
  }
}
