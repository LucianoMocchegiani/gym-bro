import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import 'credential_offers_repository.dart';
import 'member_wallet_service.dart';

/// Credenciales pendientes de aceptación (OID4VCI) + botón Aceptar.
///
/// Ocupa como máximo la mitad de la altura de pantalla; si hay más ítems, scrollea.
class CredentialOffersSection extends StatefulWidget {
  /// Crea la sección.
  ///
  /// [refreshToken] fuerza reload. [onAccepted] tras guardar una VC en wallet.
  const CredentialOffersSection({
    super.key,
    this.refreshToken,
    this.onAccepted,
  });

  /// Token opaco para forzar reload desde el padre.
  final Object? refreshToken;

  /// Se llama tras aceptar OK (≥1 VC en wallet).
  final VoidCallback? onAccepted;

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
            content: Text(
              'Aceptada, pero todavía no llegó la credencial. Probá de nuevo.',
            ),
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
      widget.onAccepted?.call();
      await _reload();
    } catch (e) {
      if (!mounted) {
        return;
      }
      if (_isInvalidOfferError(e)) {
        try {
          final repo = context.read<CredentialOffersRepository>();
          await repo.markFailed(
            item.id,
            reason: _failReason(e),
          );
        } catch (_) {
          // Soft.
        }
        if (!mounted) {
          return;
        }
        messenger.showSnackBar(
          const SnackBar(
            content: Text(
              'Esta credencial ya no es válida. Pedile al gym que la '
              'vuelva a emitir.',
            ),
          ),
        );
        await _reload();
        return;
      }
      messenger.showSnackBar(
        SnackBar(content: Text(_friendlyError(e))),
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
    if (future == null) {
      return const SizedBox.shrink();
    }

    return FutureBuilder<List<CredentialOfferItem>>(
      future: future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Center(
              child: SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          );
        }
        if (snap.hasError) {
          final msg = snap.error is ApiException
              ? (snap.error! as ApiException).message
              : 'No se pudieron cargar las pendientes';
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
          return const SizedBox.shrink();
        }

        final maxH = MediaQuery.sizeOf(context).height * 0.5;

        return ConstrainedBox(
          constraints: BoxConstraints(maxHeight: maxH),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Credenciales pendientes de aceptación',
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
                Text(
                  'Aceptalas para guardarlas en tu celular.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 8),
                for (final o in items)
                  Card(
                    child: ListTile(
                      title: Text(o.packName),
                      subtitle: Text(
                        o.validUntil == null
                            ? 'Desde ${o.validFrom.toLocal().toIso8601String().split('T').first}'
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
              ],
            ),
          ),
        );
      },
    );
  }

  String _friendlyError(Object e) {
    final raw = e is ApiException ? e.message : e.toString();
    final lower = raw.toLowerCase();
    if (_isInvalidOfferError(e)) {
      return 'Esta credencial ya no es válida. Pedile al gym que la '
          'vuelva a emitir.';
    }
    if (lower.contains('timeout') || lower.contains('connection')) {
      return 'Sin conexión. Revisá internet o el tunnel del gym.';
    }
    return 'No se pudo aceptar: $raw';
  }

  bool _isInvalidOfferError(Object e) {
    final raw = e is ApiException ? e.message : e.toString();
    final lower = raw.toLowerCase();
    if (lower.contains('timeout') || lower.contains('connection')) {
      return false;
    }
    return lower.contains('404') ||
        lower.contains('not found') ||
        lower.contains('expired') ||
        lower.contains('invalid') ||
        lower.contains('vencid');
  }

  String _failReason(Object e) {
    final raw = e is ApiException ? e.message : e.toString();
    final clipped = raw.length > 400 ? '${raw.substring(0, 400)}…' : raw;
    return 'Wallet OID4VCI: $clipped';
  }
}
