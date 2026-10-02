import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import 'auth_controller.dart';

const _confirmWord = 'ELIMINAR';

/// Eliminar la cuenta Faciliter (CU-CTA-001, requisito de App Store y Play).
///
/// Explica qué se borra y qué conserva cada gym, y pide escribir ELIMINAR.
/// Al confirmar: la API anonimiza la cuenta, la app borra la wallet del
/// celular y cierra sesión (vuelve al login). Si es dueña de un gym activo,
/// la API responde 409 y se muestra el motivo (RN-CTA-003).
class DeleteAccountScreen extends StatefulWidget {
  /// Crea la pantalla.
  const DeleteAccountScreen({super.key});

  @override
  State<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends State<DeleteAccountScreen> {
  final _confirm = TextEditingController();
  bool _busy = false;
  String? _error;

  bool get _confirmed => _confirm.text.trim().toUpperCase() == _confirmWord;

  @override
  void dispose() {
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_confirmed) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<AuthController>().deleteAccount();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'No se pudo eliminar la cuenta');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Eliminar cuenta')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              'Esto no se puede deshacer.',
              style: theme.textTheme.titleMedium?.copyWith(color: scheme.error),
            ),
            const SizedBox(height: 16),
            _bullets(context, 'Se borra', const [
              'Tu cuenta: no vas a poder entrar con este mail, Google ni Apple.',
              'Tus avisos y preferencias.',
              'Las credenciales de la wallet de este celular.',
              'Tus reservas futuras y los débitos automáticos activos.',
              'Lo que te quede de packs vigentes.',
            ]),
            const SizedBox(height: 16),
            _bullets(context, 'Cada gym conserva', const [
              'Tu ficha y el historial de pagos y comprobantes. '
                  'Si querés que también lo borren, pediselo al gym.',
            ]),
            const SizedBox(height: 16),
            Text(
              'Si después volvés a entrar con el mismo mail, empezás con una '
              'cuenta nueva y vacía.',
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _confirm,
              enabled: !_busy,
              textCapitalization: TextCapitalization.characters,
              autocorrect: false,
              decoration: const InputDecoration(
                labelText: 'Escribí $_confirmWord para confirmar',
              ),
              onChanged: (_) => setState(() {}),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(color: scheme.error)),
            ],
            const SizedBox(height: 20),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: scheme.error,
                foregroundColor: scheme.onError,
              ),
              onPressed: _busy || !_confirmed ? null : _submit,
              child: Text(_busy ? 'Eliminando…' : 'Eliminar mi cuenta'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _bullets(BuildContext context, String title, List<String> items) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: theme.textTheme.titleSmall),
        const SizedBox(height: 6),
        for (final item in items)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('•  '),
                Expanded(child: Text(item, style: theme.textTheme.bodyMedium)),
              ],
            ),
          ),
      ],
    );
  }
}
