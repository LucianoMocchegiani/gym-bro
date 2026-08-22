import 'package:flutter/material.dart';

/// Badge de estado reutilizable (label + color con fondo transparente).
class GymBroBadge extends StatelessWidget {
  /// Crea el badge.
  const GymBroBadge({super.key, required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        color: color.withValues(alpha: 0.12),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}

/// Fila icon + texto para información secundaria en cards.
class GymBroInfoLine extends StatelessWidget {
  /// Crea la línea de info.
  const GymBroInfoLine({super.key, required this.icon, required this.text, this.expanded = true});

  final IconData icon;
  final String text;

  /// Si es `true` el texto se trunca con `Expanded`; si es `false` ocupa su tamaño natural.
  final bool expanded;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final textWidget = Text(
      text,
      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: scheme.onSurface.withValues(alpha: 0.8),
          ),
    );
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(icon, size: 16, color: scheme.onSurface.withValues(alpha: 0.6)),
          const SizedBox(width: 8),
          if (expanded) Expanded(child: textWidget) else textWidget,
        ],
      ),
    );
  }
}

/// Panel de mensaje vacío / error con icono, texto y acción opcional.
class GymBroMessagePane extends StatelessWidget {
  /// Crea el panel de mensaje.
  const GymBroMessagePane({
    super.key,
    required this.icon,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 56, color: scheme.primary),
              const SizedBox(height: 12),
              Text(
                message,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              if (actionLabel != null) ...[
                const SizedBox(height: 12),
                TextButton(onPressed: onAction, child: Text(actionLabel!)),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

/// Formatea DateTime a `dd mes · HH:MM` (mes abreviado en español).
String formatDateTimeShort(DateTime dt) {
  const months = [
    'ene','feb','mar','abr','may','jun',
    'jul','ago','sep','oct','nov','dic',
  ];
  final local = dt.toLocal();
  return '${local.day} ${months[local.month - 1]} · '
      '${local.hour.toString().padLeft(2, '0')}:'
      '${local.minute.toString().padLeft(2, '0')}';
}
