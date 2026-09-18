import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

/// Preview corta de un checkout MP (host + cola del path).
String mpCheckoutPreview(String url) {
  final parsed = Uri.tryParse(url);
  if (parsed == null || parsed.host.isEmpty) {
    if (url.length <= 36) {
      return url;
    }
    return '${url.substring(0, 32)}…';
  }
  final host = parsed.host.replaceFirst(RegExp(r'^www\.'), '');
  final parts = parsed.pathSegments.where((s) => s.isNotEmpty).toList();
  final tail = parts.isEmpty ? parsed.path : parts.last;
  final short = tail.length > 12
      ? '${tail.substring(0, 8)}…${tail.substring(tail.length - 4)}'
      : tail;
  return '$host/$short';
}

/// Card de checkout MP: QR, URL recortada, copiar/abrir y limpiar.
///
/// No anula la preference. CU-PAG-001 (staff Caja y carrito afiliado).
class MpCheckoutShare extends StatelessWidget {
  /// Crea la card.
  const MpCheckoutShare({
    super.key,
    required this.url,
    required this.approved,
    required this.onCopy,
    required this.onOpen,
    this.onClear,
    this.onReceipt,
    this.clearLabel,
  });

  final String url;
  final bool approved;
  final VoidCallback onCopy;
  final VoidCallback onOpen;
  final VoidCallback? onClear;
  final VoidCallback? onReceipt;

  /// Texto del botón de reset. Null = Pendiente → Cancelar y limpiar.
  final String? clearLabel;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final label = clearLabel ?? (approved ? 'Limpiar' : 'Cancelar y limpiar');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Link de pago MP',
                style: Theme.of(context).textTheme.titleSmall,
              ),
            ),
            Chip(
              label: Text(approved ? 'Aprobado' : 'Pendiente'),
              visualDensity: VisualDensity.compact,
              backgroundColor: approved
                  ? scheme.primaryContainer
                  : scheme.tertiaryContainer,
            ),
          ],
        ),
        const SizedBox(height: 8),
        Center(
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: scheme.outline.withValues(alpha: 0.4)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: QrImageView(
                data: url,
                size: 148,
                backgroundColor: Colors.white,
              ),
            ),
          ),
        ),
        const SizedBox(height: 10),
        DecoratedBox(
          decoration: BoxDecoration(
            color: scheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: scheme.outline.withValues(alpha: 0.4)),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(10, 4, 4, 4),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    mpCheckoutPreview(url),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
                TextButton(onPressed: onCopy, child: const Text('Copiar')),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        if (!approved)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              'Esperando el pago…',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            if (approved && onReceipt != null)
              FilledButton(
                onPressed: onReceipt,
                child: const Text('Ver comprobante'),
              ),
            OutlinedButton(onPressed: onOpen, child: const Text('Abrir')),
            if (onClear != null)
              OutlinedButton(onPressed: onClear, child: Text(label)),
          ],
        ),
      ],
    );
  }
}
