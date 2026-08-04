import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:identity_core_dart/identity_core.dart';

import 'wallet_credential_ui.dart';

/// Fondo color + imagen + sheen (Credencial-v2 de quark-wallet).
class _CredentialSheenBackground extends StatelessWidget {
  const _CredentialSheenBackground({
    required this.backgroundColor,
    this.backgroundImageUrl,
  });

  final Color backgroundColor;
  final String? backgroundImageUrl;

  @override
  Widget build(BuildContext context) {
    final imageUrl = backgroundImageUrl;
    final showImage =
        imageUrl != null && CredentialDisplayStyle.isRasterImageUrl(imageUrl);

    return Stack(
      fit: StackFit.expand,
      children: [
        ColoredBox(color: backgroundColor),
        if (showImage)
          Image.network(
            imageUrl,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) =>
                const SizedBox.shrink(),
          ),
        _sheen(
          left: 200,
          top: -61,
          color: Colors.white.withValues(alpha: 0.25),
        ),
        _sheen(
          left: -6,
          top: 53,
          color: Colors.black.withValues(alpha: 0.05),
        ),
      ],
    );
  }

  Widget _sheen({
    required double left,
    required double top,
    required Color color,
  }) {
    return Positioned(
      left: left,
      top: top,
      child: IgnorePointer(
        child: ImageFiltered(
          imageFilter: ui.ImageFilter.blur(sigmaX: 18, sigmaY: 18),
          child: Transform.rotate(
            angle: -0.776,
            child: Container(
              width: 103,
              height: 136,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(60),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Card SSI fija + detalle expandible **debajo** (estilo GymBro).
///
/// La card no cambia de alto al expandir; el panel de claims anima abajo.
/// [onDelete] muestra acción destructiva en el detalle expandido.
class SsiCredentialTile extends StatefulWidget {
  /// Crea el tile.
  const SsiCredentialTile({
    super.key,
    required this.credential,
    this.onDelete,
  });

  final WalletCredentialUi credential;

  /// Callback para eliminar esta VC (el padre confirma con diálogo).
  final VoidCallback? onDelete;

  @override
  State<SsiCredentialTile> createState() => _SsiCredentialTileState();
}

class _SsiCredentialTileState extends State<SsiCredentialTile> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final c = widget.credential;
    final fg = c.resolvedForeground;
    final scheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            borderRadius: BorderRadius.circular(16),
            child: SizedBox(
              height: 112,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: _CredentialSheenBackground(
                        backgroundColor: c.resolvedBackground,
                        backgroundImageUrl: c.backgroundImageUrl,
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      child: Row(
                        children: [
                          _logo(c),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  c.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: fg.withValues(alpha: 0.9),
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  c.issuer,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: fg.withValues(alpha: 0.65),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Icon(
                            _expanded
                                ? Icons.expand_less
                                : Icons.expand_more,
                            color: fg.withValues(alpha: 0.45),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        AnimatedSize(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          alignment: Alignment.topCenter,
          child: _expanded
              ? Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: _ClaimsDetailPanel(
                    claims: c.claims,
                    scheme: scheme,
                    onDelete: widget.onDelete,
                  ),
                )
              : const SizedBox.shrink(),
        ),
      ],
    );
  }

  Widget _logo(WalletCredentialUi c) {
    final url = c.logoUrl;
    final fg = c.resolvedForeground;
    final child = url != null && CredentialDisplayStyle.isRasterImageUrl(url)
        ? ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              url,
              width: 36,
              height: 36,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => Icon(
                Icons.badge_outlined,
                color: fg.withValues(alpha: 0.7),
              ),
            ),
          )
        : Icon(Icons.badge_outlined, size: 32, color: fg.withValues(alpha: 0.7));

    return Stack(
      clipBehavior: Clip.none,
      children: [
        child,
        Positioned(
          right: -4,
          bottom: -4,
          child: Icon(
            Icons.verified,
            size: 16,
            color: fg.withValues(alpha: 0.85),
          ),
        ),
      ],
    );
  }
}

/// Panel de claims con look GymBro (surface / outline), no colores de la VC.
class _ClaimsDetailPanel extends StatelessWidget {
  const _ClaimsDetailPanel({
    required this.claims,
    required this.scheme,
    this.onDelete,
  });

  final List<LabeledClaim> claims;
  final ColorScheme scheme;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.outline.withValues(alpha: 0.7)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (claims.isEmpty)
              Text(
                'Sin atributos para mostrar',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: scheme.onSurface.withValues(alpha: 0.6),
                    ),
              )
            else
              for (var i = 0; i < claims.length; i++) ...[
                if (i > 0)
                  Divider(
                    height: 18,
                    color: scheme.outline.withValues(alpha: 0.45),
                  ),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      flex: 2,
                      child: Text(
                        claims[i].label,
                        style: Theme.of(context).textTheme.labelMedium
                            ?.copyWith(
                          color: scheme.onSurface.withValues(alpha: 0.55),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 3,
                      child: Text(
                        _formatValue(claims[i].value),
                        style: Theme.of(context).textTheme.bodyMedium
                            ?.copyWith(fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ],
            if (onDelete != null) ...[
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: onDelete,
                  icon: Icon(Icons.delete_outline, color: scheme.error),
                  label: Text(
                    'Eliminar',
                    style: TextStyle(color: scheme.error),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatValue(Object? value) {
    if (value == null) return '—';
    if (value is String) return value.isEmpty ? '—' : value;
    return value.toString();
  }
}
