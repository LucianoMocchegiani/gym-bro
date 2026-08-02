import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import 'access_repository.dart';

/// Motivos de acceso legibles (alineado a web `access-labels`).
String formatAccessReason(String code) {
  const map = {
    'ok_acceso_libre': 'Acceso libre OK',
    'ok_reserva': 'Reserva OK',
    'ok_pase_manual': 'Pase manual',
    'credencial_invalida': 'Credencial inválida',
    'tenant_mismatch': 'Gym incorrecto',
    'tenant_suspendido': 'Gym suspendido',
    'afiliado_inactivo': 'Afiliado inactivo',
    'sin_derecho': 'Sin derecho de ingreso',
    'deuda_excedida': 'Deuda fuera de tolerancia',
    'multi_ingreso_excedido': 'Tope de ingresos del día',
    'payload_invalido': 'QR inválido',
  };
  return map[code] ?? code;
}

/// Mi QR / escanear local (CU-ACC-001 modo B).
class QrScreen extends StatefulWidget {
  /// Crea la pantalla.
  const QrScreen({super.key});

  @override
  State<QrScreen> createState() => _QrScreenState();
}

class _QrScreenState extends State<QrScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

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
            Tab(text: 'Escanear local'),
            Tab(text: 'Mi credencial'),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: _tabs,
            children: const [_ScanVenueTab(), _MyCredentialTab()],
          ),
        ),
      ],
    );
  }
}

class _ScanVenueTab extends StatefulWidget {
  const _ScanVenueTab();

  @override
  State<_ScanVenueTab> createState() => _ScanVenueTabState();
}

class _ScanVenueTabState extends State<_ScanVenueTab> {
  final MobileScannerController _scanner = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
  );
  bool _handling = false;
  AccessCheckInResult? _result;
  String? _error;

  @override
  void dispose() {
    _scanner.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_handling) {
      return;
    }
    final raw = capture.barcodes
        .map((b) => b.rawValue)
        .whereType<String>()
        .firstOrNull;
    if (raw == null) {
      return;
    }
    final venue = parseVenueToken(raw);
    if (venue == null) {
      setState(() {
        _error = 'QR no reconocido. Escaneá el QR de la puerta del gym.';
        _result = null;
      });
      return;
    }

    setState(() {
      _handling = true;
      _error = null;
    });
    await _scanner.stop();

    if (!mounted) return;
    final repo = context.read<AccessRepository>();

    try {
      final res = await repo.checkIn(venueToken: venue);
      if (!mounted) return;
      setState(() => _result = res);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _result = null;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'No se pudo completar el ingreso';
        _result = null;
      });
    }
  }

  Future<void> _scanAgain() async {
    setState(() {
      _result = null;
      _error = null;
      _handling = false;
    });
    await _scanner.start();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    if (_result != null) {
      final ok = _result!.allowed;
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
                    ok ? 'PERMITIDO' : 'DENEGADO',
                    style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      color: ok ? scheme.primary : scheme.error,
                      letterSpacing: 2,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    formatAccessReason(_result!.reasonCode),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
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
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Text(
            'Apuntá al QR de la pantalla de puerta del gym.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(_error!, style: TextStyle(color: scheme.error)),
          ),
        Expanded(
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
        const SizedBox(height: 12),
      ],
    );
  }
}

class _MyCredentialTab extends StatefulWidget {
  const _MyCredentialTab();

  @override
  State<_MyCredentialTab> createState() => _MyCredentialTabState();
}

class _MyCredentialTabState extends State<_MyCredentialTab> {
  AccessCredential? _cred;
  String? _error;
  bool _loading = true;
  bool _issuing = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final cred = await context.read<AccessRepository>().getActive();
      if (!mounted) return;
      setState(() {
        _cred = cred;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'No se pudo cargar la credencial';
        _loading = false;
      });
    }
  }

  Future<void> _issue() async {
    setState(() => _issuing = true);
    try {
      final cred = await context.read<AccessRepository>().issue();
      if (!mounted) return;
      setState(() {
        _cred = cred;
        _error = null;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _issuing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'Credencial de vínculo (modo gym escanea afiliado).',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 16),
        if (_error != null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(_error!),
            ),
          ),
        if (_cred == null && _error == null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  const Text('Todavía no tenés credencial activa.'),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _issuing ? null : _issue,
                    child: Text(_issuing ? 'Emitiendo…' : 'Emitir credencial'),
                  ),
                ],
              ),
            ),
          ),
        if (_cred != null) ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: scheme.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: scheme.primary, width: 2),
                    ),
                    child: Column(
                      children: [
                        Icon(Icons.qr_code_2, size: 72, color: scheme.primary),
                        const SizedBox(height: 12),
                        SelectableText(
                          _cred!.presentationToken,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () async {
                            await Clipboard.setData(
                              ClipboardData(text: _cred!.presentationToken),
                            );
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Token copiado')),
                              );
                            }
                          },
                          child: const Text('Copiar'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: FilledButton(
                          onPressed: _issuing ? null : _issue,
                          child: Text(_issuing ? '…' : 'Actualizar'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}
