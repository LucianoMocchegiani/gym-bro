import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:identity_core_dart/identity_core.dart';

import 'wallet_credential_ui.dart';
import '../../core/theme/gymbro_theme.dart';

const double _panelOverlap = 16;
const double _panelInset = 16;

/// Fondo color + imagen + sheen (card principal Kuatia).
class _CredentialSheenBackground extends StatelessWidget {
  const _CredentialSheenBackground({
    required this.backgroundColor,
    this.backgroundImageUrl,
    this.textColor,
    this.brandGradient = false,
  });

  final Color backgroundColor;
  final String? backgroundImageUrl;
  final Color? textColor;
  final bool brandGradient;

  @override
  Widget build(BuildContext context) {
    final imageUrl = backgroundImageUrl;
    final showImage =
        imageUrl != null && CredentialDisplayStyle.isRasterImageUrl(imageUrl);

    return Stack(
      fit: StackFit.expand,
      children: [
        if (brandGradient)
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  CredentialDisplayStyle.brandGreen,
                  CredentialDisplayStyle.brandGreenDeep,
                  GymBroColors.darkBg,
                ],
                stops: const [0.0, 0.55, 1.0],
              ),
            ),
          )
        else
          ColoredBox(color: backgroundColor),
        if (showImage)
          Image.network(
            imageUrl,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) =>
                const SizedBox.shrink(),
          ),
        if (showImage && textColor != null) _TextScrim(textColor: textColor!),
        _sheen(
          left: 200,
          top: -61,
          color: brandGradient
              ? GymBroColors.lime.withValues(alpha: 0.22)
              : Colors.white.withValues(alpha: 0.25),
        ),
        _sheen(left: -6, top: 53, color: Colors.black.withValues(alpha: 0.08)),
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

class _TextScrim extends StatelessWidget {
  const _TextScrim({required this.textColor});

  final Color textColor;

  @override
  Widget build(BuildContext context) {
    final edge = CredentialDisplayStyle.contrastAgainst(textColor);
    return IgnorePointer(
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
            colors: [
              edge.withValues(alpha: 0.52),
              edge.withValues(alpha: 0.28),
              edge.withValues(alpha: 0.08),
            ],
            stops: const [0.0, 0.45, 1.0],
          ),
        ),
      ),
    );
  }
}

/// Card SSI principal al estilo Kuatia; el detalle asoma detrás.
///
/// [onDelete] queda en el panel expandido. Sin editor de estilo (v2).
class SsiCredentialTile extends StatefulWidget {
  /// Crea el tile.
  const SsiCredentialTile({super.key, required this.credential, this.onDelete});

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
    final brightness = Theme.of(context).brightness;
    final scheme = Theme.of(context).colorScheme;
    final fg = c.resolvedForeground(brightness);
    final bg = c.resolvedBackground(brightness);
    final hasPhoto = CredentialDisplayStyle.isRasterImageUrl(
      c.backgroundImageUrl,
    );
    final textShadows = hasPhoto
        ? CredentialDisplayStyle.legibilityShadows(fg)
        : null;
    final hasDetails = c.claims.isNotEmpty || widget.onDelete != null;

    final card = Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: hasDetails ? () => setState(() => _expanded = !_expanded) : null,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(16)),
          child: Stack(
            children: [
              Positioned.fill(
                child: _CredentialSheenBackground(
                  backgroundColor: bg,
                  backgroundImageUrl: c.backgroundImageUrl,
                  textColor: fg,
                  brandGradient: c.backgroundColor == null,
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHead(c, hasDetails, fg, textShadows),
                    const SizedBox(height: 14),
                    Opacity(
                      opacity: 0.7,
                      child: Text(
                        c.issuer,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 14,
                          height: 19 / 14,
                          fontWeight: FontWeight.w600,
                          color: fg,
                          shadows: textShadows,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );

    return AnimatedSize(
      duration: const Duration(milliseconds: 200),
      alignment: Alignment.topCenter,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        verticalDirection: VerticalDirection.up,
        children: [
          if (_expanded && hasDetails)
            _ClaimsDetailPanel(
              claims: c.claims,
              scheme: scheme,
              onDelete: widget.onDelete,
            ),
          card,
        ],
      ),
    );
  }

  Widget _buildHead(
    WalletCredentialUi c,
    bool hasDetails,
    Color fg,
    List<Shadow>? textShadows,
  ) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        _logo(c),
        const SizedBox(width: 12),
        Expanded(
          child: Opacity(
            opacity: 0.8,
            child: Text(
              c.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 16,
                height: 22 / 16,
                fontWeight: FontWeight.w600,
                color: fg,
                shadows: textShadows,
              ),
            ),
          ),
        ),
        if (hasDetails) ...[
          const SizedBox(width: 8),
          Icon(
            _expanded
                ? Icons.visibility_outlined
                : Icons.visibility_off_outlined,
            size: 22,
            color: fg.withValues(alpha: 0.4),
          ),
        ],
      ],
    );
  }

  Widget _logo(WalletCredentialUi c) {
    const size = 32.0;
    final url = c.logoUrl;
    final inner = url != null && CredentialDisplayStyle.isRasterImageUrl(url)
        ? Image.network(
            url,
            width: size,
            height: size,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) =>
                _logoPlaceholder(size),
          )
        : _logoPlaceholder(size);

    return Container(
      width: size,
      height: size,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.black.withValues(alpha: 0.2)),
      ),
      child: inner,
    );
  }

  Widget _logoPlaceholder(double size) {
    return Icon(
      Icons.badge_outlined,
      size: size * 0.55,
      color: Colors.black.withValues(alpha: 0.35),
    );
  }
}

/// Panel de claims que asoma detrás de la card (Kuatia).
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
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: _panelInset),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            top: -_panelOverlap,
            left: 0,
            right: 0,
            bottom: 0,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: scheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: scheme.outline.withValues(alpha: 0.7),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
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
                                  color: scheme.onSurface.withValues(
                                    alpha: 0.55,
                                  ),
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
                  const SizedBox(height: 8),
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
        ],
      ),
    );
  }

  String _formatValue(Object? value) {
    if (value == null) {
      return '—';
    }
    if (value is String) {
      return value.isEmpty ? '—' : value;
    }
    if (value is bool) {
      return value ? 'Sí' : 'No';
    }
    return value.toString();
  }
}
