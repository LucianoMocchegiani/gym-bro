import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import '../account/account_repository.dart';
import '../auth/auth_controller.dart';
import '../credentials/credential_offers_section.dart';

/// Home: estado de cuenta + offers OID4VCI + atajos (wireframe afiliado).
class HomeScreen extends StatefulWidget {
  /// Crea la pantalla.
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Future<MemberAccount>? _future;
  int _refreshToken = 0;
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
      _refreshToken++;
      _future = context.read<AccountRepository>().fetchMine();
    });
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthController>().session;
    final hello = session?.name?.trim().isNotEmpty == true
        ? session!.name!
        : (session?.email ?? 'afiliado');
    final future = _future;

    return RefreshIndicator(
      onRefresh: _reload,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          Text(
            (session?.tenantSlug ?? 'gym').toUpperCase(),
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              color: Theme.of(context).colorScheme.primary,
              letterSpacing: 1.5,
            ),
          ),
          Text('Hola, $hello', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 16),
          CredentialOffersSection(refreshToken: _refreshToken),
          const SizedBox(height: 24),
          if (future == null)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 48),
              child: Center(child: CircularProgressIndicator()),
            )
          else
            FutureBuilder<MemberAccount>(
              future: future,
              builder: (context, snap) {
                if (snap.connectionState != ConnectionState.done) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 48),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                if (snap.hasError) {
                  final msg = snap.error is ApiException
                      ? (snap.error! as ApiException).message
                      : 'No se pudo cargar la cuenta';
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(msg),
                          const SizedBox(height: 8),
                          TextButton(
                            onPressed: _reload,
                            child: const Text('Reintentar'),
                          ),
                        ],
                      ),
                    ),
                  );
                }
                final account = snap.data!;
                final active = account.contracts
                    .where((c) => c.status == 'ACTIVE')
                    .toList();
                final packLabel = active.isEmpty
                    ? 'Sin pack activo'
                    : active.map((c) => c.packName).join(', ');
                final ends = active.isEmpty
                    ? null
                    : active
                          .map((c) => c.endsAt)
                          .whereType<DateTime>()
                          .fold<DateTime?>(null, (a, b) {
                            if (a == null) return b;
                            return a.isBefore(b) ? a : b;
                          });

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Estado de cuenta',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const SizedBox(height: 12),
                            _row('Pack', packLabel),
                            if (ends != null)
                              _row(
                                'Vence',
                                ends
                                    .toLocal()
                                    .toIso8601String()
                                    .split('T')
                                    .first,
                              ),
                            _row(
                              'Créditos',
                              '${account.totalCreditsRemaining}',
                            ),
                            _row(
                              'Acceso libre',
                              account.hasAccessLibre ? 'Sí' : 'No',
                            ),
                            _row(
                              'Deuda',
                              account.debtStatus == 'AL_DIA'
                                  ? 'Al día'
                                  : '\$${account.debtAmount}',
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Próximas reservas',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    if (account.reservations.isEmpty)
                      const Text('No hay reservas próximas')
                    else
                      ...account.reservations.map(
                        (r) => Card(
                          child: ListTile(
                            title: Text(r.serviceName),
                            subtitle: Text(
                              r.startsAt.toLocal().toString().substring(0, 16),
                            ),
                            trailing: Text(r.status),
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(
            width: 110,
            child: Text(label, style: Theme.of(context).textTheme.bodySmall),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
