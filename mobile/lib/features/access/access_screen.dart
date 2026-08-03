import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import '../credentials/credential_offers_repository.dart';
import '../credentials/credentials_screen.dart';
import '../credentials/member_wallet_service.dart';

/// Hub Acceso: Escanear (default) + Credenciales (pendientes + wallet).
class AccessScreen extends StatefulWidget {
  /// Crea la pantalla.
  const AccessScreen({super.key});

  @override
  State<AccessScreen> createState() => _AccessScreenState();
}

class _AccessScreenState extends State<AccessScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  int _credsRefresh = 0;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TabBar(
          controller: _tabs,
          labelColor: Theme.of(context).colorScheme.primary,
          unselectedLabelColor: Theme.of(context).colorScheme.onSurface,
          tabs: const [
            Tab(text: 'Escanear'),
            Tab(text: 'Credenciales'),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: _tabs,
            children: [
              _ScanTab(
                onCredentialIssued: () {
                  setState(() => _credsRefresh++);
                  _tabs.animateTo(1);
                },
              ),
              CredentialsScreen(
                refreshToken: _credsRefresh,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ScanTab extends StatefulWidget {
  const _ScanTab({required this.onCredentialIssued});

  final VoidCallback onCredentialIssued;

  @override
  State<_ScanTab> createState() => _ScanTabState();
}

class _ScanTabState extends State<_ScanTab> with AutomaticKeepAliveClientMixin {
  final MobileScannerController _scanner = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
  );
  bool _handling = false;
  String? _statusTitle;
  String? _statusDetail;
  bool? _ok;

  @override
  bool get wantKeepAlive => true;

  @override
  void dispose() {
    _scanner.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_handling) return;
    final raw = capture.barcodes
        .map((b) => b.rawValue)
        .whereType<String>()
        .firstOrNull;
    if (raw == null || raw.trim().isEmpty) return;

    setState(() {
      _handling = true;
      _ok = null;
      _statusTitle = null;
      _statusDetail = null;
    });
    await _scanner.stop();

    if (!mounted) return;
    final wallet = context.read<MemberWalletService>();
    final offers = context.read<CredentialOffersRepository>();

    try {
      final result = await wallet.handleScannedInvitation(raw);
      if (!mounted) return;

      if (result.kind == WalletScanKind.oid4vci) {
        await _tryMarkAccepted(offers, result.offerUri);
        setState(() {
          _ok = true;
          _statusTitle = 'Credencial guardada';
          _statusDetail =
              'Ya está en tu celular (${result.credentialsAcquired}). '
              'Podés verla en Credenciales.';
        });
        widget.onCredentialIssued();
      } else if (result.kind == WalletScanKind.oid4vp) {
        setState(() {
          _ok = result.presentationOk;
          _statusTitle = result.presentationOk
              ? 'Acceso enviado'
              : 'No se pudo presentar';
          _statusDetail = result.presentationOk
              ? 'Listo. El gym recibió tu credencial.'
              : (result.errorMessage ??
                  'El gym no aceptó la presentación.');
        });
      }
    } on UnsupportedInvitationException catch (e) {
      if (!mounted) return;
      setState(() {
        _ok = false;
        _statusTitle = 'QR no reconocido';
        _statusDetail = e.message;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _ok = false;
        _statusTitle = 'Error';
        _statusDetail = e.message;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _ok = false;
        _statusTitle = 'No se pudo completar';
        _statusDetail = e.toString();
      });
    }
  }

  Future<void> _tryMarkAccepted(
    CredentialOffersRepository offers,
    String? offerUri,
  ) async {
    if (offerUri == null || offerUri.isEmpty) return;
    try {
      final pending = await offers.listPending();
      final normalized = offerUri.trim();
      for (final o in pending) {
        final uri = o.offerUri;
        if (uri == null) continue;
        if (uri == normalized ||
            uri.contains(normalized) ||
            normalized.contains(uri)) {
          await offers.markAccepted(o.id);
          return;
        }
      }
    } catch (_) {
      // Soft.
    }
  }

  Future<void> _scanAgain() async {
    setState(() {
      _handling = false;
      _ok = null;
      _statusTitle = null;
      _statusDetail = null;
    });
    await _scanner.start();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final scheme = Theme.of(context).colorScheme;

    if (_statusTitle != null) {
      final ok = _ok == true;
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            color: ok
                ? scheme.primary.withValues(alpha: 0.18)
                : scheme.error.withValues(alpha: 0.18),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Text(
                    _statusTitle!,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: ok ? scheme.primary : scheme.error,
                        ),
                  ),
                  if (_statusDetail != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      _statusDetail!,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: _scanAgain,
                    child: const Text('Escanear de nuevo'),
                  ),
                ],
              ),
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Text(
            'Apuntá al QR del gym para entrar o para recibir una credencial.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  MobileScanner(controller: _scanner, onDetect: _onDetect),
                  if (_handling)
                    const ColoredBox(
                      color: Color(0x99000000),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
