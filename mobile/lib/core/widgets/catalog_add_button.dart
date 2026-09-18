import 'package:flutter/material.dart';

/// Botón circular **+** para agregar al carrito (mismo gesto que Caja web).
class CatalogAddButton extends StatelessWidget {
  /// Crea el botón.
  const CatalogAddButton({
    super.key,
    required this.onPressed,
    this.tooltip = 'Agregar al carrito',
  });

  final VoidCallback? onPressed;
  final String tooltip;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 12),
      child: IconButton.filled(
        tooltip: tooltip,
        onPressed: onPressed,
        icon: const Icon(Icons.add, size: 18),
        style: IconButton.styleFrom(
          minimumSize: const Size(32, 32),
          maximumSize: const Size(32, 32),
          padding: EdgeInsets.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          visualDensity: VisualDensity.compact,
        ),
      ),
    );
  }
}
