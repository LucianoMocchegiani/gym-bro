import 'package:flutter/material.dart';

import '../../core/widgets/shared_widgets.dart';

/// Tipo de ítem del catálogo afiliado (Tienda).
///
/// [product] queda listo para el módulo post-MVP; no hay pestaña todavía.
enum CatalogKind {
  pack,
  session,
  product,
}

/// Ítem vendible: pack, drop-in de sesión o producto futuro.
///
/// La misma [CatalogCard] renderiza los tres. `kind` + `id` identifican
/// el cobro (PACK / DROP_IN).
class CatalogItem {
  /// Crea el ítem.
  const CatalogItem({
    required this.id,
    required this.kind,
    required this.title,
    this.price,
    this.imageUrl,
    this.subtitle,
    this.badges = const [],
    this.details = const [],
    this.enabled = true,
    this.owned = false,
  });

  final String id;
  final CatalogKind kind;
  final String title;
  final String? subtitle;

  /// Foto: pack propio, o del servicio en drop-in.
  final String? imageUrl;

  /// Etiquetas bajo el título (p. ej. Drop-in + Única sesión).
  final List<String> badges;

  /// Precio en ARS. Null = no se muestra (sesión sin drop-in).
  final int? price;
  final List<String> details;

  /// Si es `false`, el botón de carrito queda deshabilitado (p. ej. sin MP).
  final bool enabled;

  /// El afiliado ya tiene este ítem (p. ej. sesión reservada/pagada).
  final bool owned;
}

/// Card de catálogo reutilizable (pack, sesión, producto).
class CatalogCard extends StatelessWidget {
  /// Crea la card.
  const CatalogCard({
    super.key,
    required this.item,
    this.onAddToCart,
    this.actionLabel,
    this.onAction,
    this.actionBusy = false,
  });

  /// Ítem a mostrar (pack, sesión o producto).
  final CatalogItem item;

  /// CTA de Tienda (`Al carrito` / `Comprada`).
  final VoidCallback? onAddToCart;

  /// Texto del botón si no es el default de Tienda.
  final String? actionLabel;

  /// Acción alternativa (reservar, waitlist, carrito desde Sesiones).
  final VoidCallback? onAction;

  /// Muestra spinner en el botón.
  final bool actionBusy;

  IconData get _placeholderIcon => switch (item.kind) {
        CatalogKind.pack => Icons.inventory_2_outlined,
        CatalogKind.session => Icons.event_available_outlined,
        CatalogKind.product => Icons.shopping_bag_outlined,
      };

  String get _label =>
      actionLabel ?? (item.owned ? 'Comprada' : 'Al carrito');

  VoidCallback? get _onPressed {
    if (onAction != null) return onAction;
    if (item.enabled && !item.owned) return onAddToCart;
    return null;
  }

  Color _badgeColor(ColorScheme scheme, String label) {
    return switch (label) {
      'Comprada' => scheme.primary,
      'Llena' => scheme.error,
      _ => scheme.secondary,
    };
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final url = item.imageUrl?.trim();
    final hasImage = url != null && url.isNotEmpty;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scheme.outline.withValues(alpha: 0.5)),
        color: scheme.surface,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 140,
            width: double.infinity,
            child: hasImage
                ? Image.network(
                    url,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) =>
                        _Placeholder(icon: _placeholderIcon),
                  )
                : _Placeholder(icon: _placeholderIcon),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                if (item.badges.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: [
                      for (final label in item.badges)
                        GymBroBadge(
                          label: label,
                          color: _badgeColor(scheme, label),
                        ),
                    ],
                  ),
                ],
                if (item.subtitle != null && item.subtitle!.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    item.subtitle!,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: scheme.onSurface.withValues(alpha: 0.7),
                        ),
                  ),
                ],
                if (item.details.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  for (final line in item.details)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(
                        line,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: scheme.onSurface.withValues(alpha: 0.7),
                            ),
                      ),
                    ),
                ],
                if (item.price != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    '\$${item.price}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: scheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ],
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: actionBusy ? null : _onPressed,
                    child: actionBusy
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(_label),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder({required this.icon});

  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ColoredBox(
      color: scheme.surfaceContainerHighest,
      child: Center(
        child: Icon(
          icon,
          size: 40,
          color: scheme.onSurface.withValues(alpha: 0.35),
        ),
      ),
    );
  }
}
