import 'dart:async';

import 'package:flutter/material.dart';
import 'package:identity_core_dart/identity_core.dart';
import 'package:provider/provider.dart';

import '../../core/widgets/confirm_dialog.dart';
import '../../core/widgets/loading_dialog.dart';
import 'credential_offers_section.dart';
import 'member_wallet_service.dart';
import 'ssi_credential_tile.dart';
import 'wallet_credential_ui.dart';

/// Credenciales en wallet + pendientes de aceptación (tab Acceso).
class CredentialsScreen extends StatefulWidget {
  /// Crea la pantalla.
  ///
  /// [refreshToken] fuerza reload (p. ej. tras emitir por QR).
  const CredentialsScreen({super.key, this.refreshToken});

  final Object? refreshToken;

  @override
  State<CredentialsScreen> createState() => _CredentialsScreenState();
}

class _CredentialsScreenState extends State<CredentialsScreen> {
  StreamSubscription<List<CredentialRecord>>? _sub;
  List<WalletCredentialUi> _items = const [];
  bool _loading = true;
  String? _error;
  int _pendingRefresh = 0;
  MemberWalletService? _wallet;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final wallet = context.read<MemberWalletService>();
    if (!identical(_wallet, wallet)) {
      _wallet?.removeListener(_onWalletChanged);
      _wallet = wallet;
      _wallet!.addListener(_onWalletChanged);
      _restartWatch();
    }
  }

  void _onWalletChanged() {
    _restartWatch();
  }

  void _restartWatch() {
    _sub?.cancel();
    _sub = _startWatch();
  }

  StreamSubscription<List<CredentialRecord>> _startWatch() {
    final wallet = context.read<MemberWalletService>();
    return Stream.fromFuture(wallet.ensureUnlocked())
        .asyncExpand((_) => wallet.watchCredentials())
        .listen(
          (records) {
            if (!mounted) return;
            setState(() {
              _items = records
                  .map(WalletCredentialMapper.fromRecord)
                  .toList(growable: false);
              _loading = false;
              _error = null;
            });
          },
          onError: (Object e) {
            if (!mounted) return;
            setState(() {
              _loading = false;
              _error = e.toString();
            });
          },
        );
  }

  @override
  void didUpdateWidget(covariant CredentialsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshToken != widget.refreshToken) {
      _reload();
      setState(() => _pendingRefresh++);
    }
  }

  @override
  void dispose() {
    _wallet?.removeListener(_onWalletChanged);
    _sub?.cancel();
    super.dispose();
  }

  Future<void> _reload() async {
    setState(() {
      _loading = true;
      _error = null;
      _pendingRefresh++;
    });
    try {
      final wallet = context.read<MemberWalletService>();
      final records = await wallet.listCredentials();
      if (!mounted) return;
      setState(() {
        _items = records
            .map(WalletCredentialMapper.fromRecord)
            .toList(growable: false);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _deleteCredential(WalletCredentialUi item) async {
    final ok = await showConfirmDialog(
      context,
      title: 'Eliminar credencial',
      message:
          '¿Eliminar «${item.title}» de este celular? '
          'Vas a tener que aceptarla de nuevo si la necesitás.',
      confirmLabel: 'Eliminar',
      isDestructive: true,
    );
    if (!ok || !mounted) return;
    final wallet = context.read<MemberWalletService>();
    try {
      await runWithLoadingDialog(
        context,
        message: 'Eliminando credencial…',
        action: () => wallet.deleteCredential(item.id),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Credencial eliminada')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo eliminar: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final pendingToken = Object.hash(widget.refreshToken, _pendingRefresh);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: CredentialOffersSection(
            refreshToken: pendingToken,
            onAccepted: _reload,
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _reload,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              children: [
                Text(
                  'En este celular',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                if (_loading)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 48),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (_error != null)
                  Card(
                    child: ListTile(
                      title: Text(_error!),
                      trailing: TextButton(
                        onPressed: _reload,
                        child: const Text('Reintentar'),
                      ),
                    ),
                  )
                else if (_items.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Text(
                      'Todavía no tenés credenciales guardadas. '
                      'Si hay pendientes arriba, aceptalas; o escaneá un QR '
                      'en Escanear.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  )
                else
                  for (final item in _items) ...[
                    SsiCredentialTile(
                      credential: item,
                      onDelete: () => _deleteCredential(item),
                    ),
                    const SizedBox(height: 12),
                  ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}
