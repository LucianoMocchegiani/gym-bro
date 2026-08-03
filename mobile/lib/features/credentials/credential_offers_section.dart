import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import 'credential_offers_repository.dart';
import 'member_wallet_service.dart';

/// Sección Home: offers OID4VCI pendientes + Aceptar.
class CredentialOffersSection extends StatefulWidget {
  /// Crea la sección.
  ///
  /// [refreshToken] cambia (p. ej. pull-to-refresh del Home) para recargar.
  const CredentialOffersSection({super.key, this.refreshToken});

  /// Token opaco para forzar reload desde el padre.
  final Object? refreshToken;

  @override
  State<CredentialOffersSection> createState() =>
      _CredentialOffersSectionState();
}

class _CredentialOffersSectionState extends State<CredentialOffersSection> {
  Future<List<CredentialOfferItem>>? _future;
  final Set<String> _accepting = {};
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_started) {
      _started = true;
      _reload();
    }
  }

  @override
  void didUpdateWidget(covariant CredentialOffersSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshToken != widget.refreshToken) {
      _reload();
    }
  }

  Future<void> _reload() async {
    final repo = context.read<CredentialOffersRepository>();
    setState(() {
      _future = repo.listPending();
    });
    await _future;
  }

  Future<void> _accept(CredentialOfferItem item) async {
    final uri = item.offerUri;
    if (uri == null || uri.isEmpty) {
      return;
    }
    setState(() => _accepting.add(item.id));
    final messenger = ScaffoldMessenger.of(context);
    try {
      final wallet = context.read<MemberWalletService>();
      final count = await wallet.acceptOffer(uri);
      if (!mounted) {
        return;
      }
      if (count < 1) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Offer aceptado (sin credencial inmediata)'),
          ),
        );
        return;
      }
      final repo = context.read<CredentialOffersRepository>();
      await repo.markAccepted(item.id);
      if (!mounted) {
        return;
      }
      messenger.showSnackBar(
        SnackBar(
          content: Text('Credencial guardada (${item.packName})'),
        ),
      );
      await _reload();
    } catch (e) {
      if (!mounted) {
        return;
      }
      final msg = _friendlyError(e);
      messenger.showSnackBar(
        SnackBar(content: Text(msg)),
      );
    } finally {
      if (mounted) {
        setState(() => _accepting.remove(item.id));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final future = _future;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Credenciales pendientes',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            IconButton(
              tooltip: 'Actualizar',
              onPressed: _reload,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (future == null)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Center(child: CircularProgressIndicator()),
          )
        else
          FutureBuilder<List<CredentialOfferItem>>(
            future: future,
            builder: (context, snap) {
              if (snap.connectionState != ConnectionState.done) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              if (snap.hasError) {
                final msg = snap.error is ApiException
                    ? (snap.error! as ApiException).message
                    : 'No se pudieron cargar los offers';
                return Card(
                  child: ListTile(
                    title: Text(msg),
                    trailing: TextButton(
                      onPressed: _reload,
                      child: const Text('Reintentar'),
                    ),
                  ),
                );
              }
              final items = snap.data ?? const <CredentialOfferItem>[];
              if (items.isEmpty) {
                return Text(
                  'No hay offers para aceptar',
                  style: Theme.of(context).textTheme.bodyMedium,
                );
              }
              return Column(
                children: items
                    .map(
                      (o) => Card(
                        child: ListTile(
                          title: Text(o.packName),
                          subtitle: Text(
                            o.validUntil == null
                                ? 'Vigente desde ${o.validFrom.toLocal().toIso8601String().split('T').first}'
                                : 'Hasta ${o.validUntil!.toLocal().toIso8601String().split('T').first}',
                          ),
                          trailing: _accepting.contains(o.id)
                              ? const SizedBox(
                                  width: 28,
                                  height: 28,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : FilledButton(
                                  onPressed: () => _accept(o),
                                  child: const Text('Aceptar'),
                                ),
                        ),
                      ),
                    )
                    .toList(),
              );
            },
          ),
      ],
    );
  }

  String _friendlyError(Object e) {
    final raw = e is ApiException ? e.message : e.toString();
    final lower = raw.toLowerCase();
    if (lower.contains('404') || lower.contains('not found')) {
      return 'Oferta vencida o inválida. Pedile al staff una re-oferta '
          'del contrato y volvé a intentar.';
    }
    if (lower.contains('timeout') || lower.contains('connection')) {
      return 'Sin conexión al issuer. Revisá el tunnel Cloudflare.';
    }
    return 'No se pudo aceptar: $raw';
  }
}
