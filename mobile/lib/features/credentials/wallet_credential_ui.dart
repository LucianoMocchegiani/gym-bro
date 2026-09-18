import 'package:flutter/material.dart';
import 'package:identity_core_dart/identity_core.dart';

import '../../core/theme/gymbro_theme.dart';

/// Estilos visuales desde `displayMetadata` OID4VCI (como quark-wallet).
@immutable
class CredentialDisplayStyle {
  const CredentialDisplayStyle({
    this.backgroundColor,
    this.textColor,
    this.logoUrl,
    this.backgroundImageUrl,
  });

  final Color? backgroundColor;
  final Color? textColor;
  final String? logoUrl;
  final String? backgroundImageUrl;

  /// Verde Faciliter (mezcla charcoal + lima), como packs vigentes.
  static final Color brandGreenDeep = Color.lerp(
    GymBroColors.darkBg,
    GymBroColors.lime,
    0.14,
  )!;

  static final Color brandGreen = Color.lerp(
    GymBroColors.darkBg,
    GymBroColors.lime,
    0.38,
  )!;

  static const Color brandForeground = Color(0xFFF4F6F2);

  /// Fallback de tarjeta: verde oscuro Faciliter (el tile pinta el gradiente).
  static (Color bg, Color fg) neutralFor(Brightness _) {
    return (brandGreenDeep, brandForeground);
  }

  static Color? colorFromHex(dynamic value) {
    if (value is! String || value.isEmpty) return null;
    var hex = value.trim().replaceFirst('#', '');
    if (hex.length == 6) {
      return Color(int.parse('FF$hex', radix: 16));
    }
    if (hex.length == 8) {
      return Color(int.parse(hex, radix: 16));
    }
    return null;
  }

  static bool isLightColor(Color color) => color.computeLuminance() > 0.45;

  static Color contrastAgainst(Color textColor) => isLightColor(textColor)
      ? const Color(0xFF000000)
      : const Color(0xFFFFFFFF);

  /// Sombras para texto sobre foto de fondo.
  static List<Shadow> legibilityShadows(Color textColor) {
    final edge = contrastAgainst(textColor);
    return [
      Shadow(
        color: edge.withValues(alpha: 0.55),
        blurRadius: 6,
        offset: const Offset(0, 1),
      ),
      Shadow(
        color: edge.withValues(alpha: 0.35),
        blurRadius: 2,
        offset: Offset.zero,
      ),
    ];
  }

  static bool isRasterImageUrl(String? url) {
    if (url == null || url.isEmpty) return false;
    final path = (Uri.tryParse(url)?.path ?? url).toLowerCase();
    return path.endsWith('.png') ||
        path.endsWith('.jpg') ||
        path.endsWith('.jpeg') ||
        path.endsWith('.webp');
  }

  static String? _imageUrl(Map<String, dynamic>? display, String key) {
    if (display == null) return null;
    final image = display[key];
    if (image is Map) {
      return image['uri'] as String? ?? image['url'] as String?;
    }
    if (image is String && image.isNotEmpty) return image;
    return null;
  }

  /// Parsea display OID4VCI.
  static CredentialDisplayStyle fromDisplayMetadata(
    Map<String, dynamic>? display,
  ) {
    if (display == null) return const CredentialDisplayStyle();
    return CredentialDisplayStyle(
      backgroundColor: colorFromHex(display['background_color']),
      textColor: colorFromHex(display['text_color']),
      logoUrl: _imageUrl(display, 'logo'),
      backgroundImageUrl: _imageUrl(display, 'background_image'),
    );
  }
}

/// Modelo UI de una VC en wallet (tarjeta + detalle).
@immutable
class WalletCredentialUi {
  const WalletCredentialUi({
    required this.id,
    required this.title,
    required this.issuer,
    required this.claims,
    this.logoUrl,
    this.backgroundColor,
    this.backgroundImageUrl,
    this.textColor,
  });

  final String id;
  final String title;
  final String issuer;
  final List<LabeledClaim> claims;
  final String? logoUrl;
  final Color? backgroundColor;
  final String? backgroundImageUrl;
  final Color? textColor;

  Color resolvedBackground(Brightness brightness) {
    if (backgroundColor != null) {
      return backgroundColor!;
    }
    return CredentialDisplayStyle.neutralFor(brightness).$1;
  }

  Color resolvedForeground(Brightness brightness) {
    if (textColor != null) {
      return textColor!;
    }
    return CredentialDisplayStyle.neutralFor(brightness).$2;
  }
}

/// Mapea [CredentialRecord] → UI (subset de CredentialUiMapper de quark-wallet).
abstract final class WalletCredentialMapper {
  /// Convierte un record del SDK a modelo de tarjeta/detalle.
  static WalletCredentialUi fromRecord(CredentialRecord record) {
    final display = _resolveDisplay(record);
    final style = CredentialDisplayStyle.fromDisplayMetadata(display);
    return WalletCredentialUi(
      id: record.id,
      title: _title(record, display),
      issuer: _issuer(record) ?? 'Emisor desconocido',
      claims: ClaimDisplayResolver.resolve(record, locale: 'es'),
      logoUrl: style.logoUrl,
      backgroundColor: style.backgroundColor,
      backgroundImageUrl: style.backgroundImageUrl,
      textColor: style.textColor,
    );
  }

  static Map<String, dynamic>? _resolveDisplay(CredentialRecord record) {
    final direct = switch (record) {
      SdJwtVcRecord(:final displayMetadata) => displayMetadata,
      W3cCredentialRecord(:final displayMetadata) => displayMetadata,
      MdocRecord(:final displayMetadata) => displayMetadata,
      _ => null,
    };
    if (direct != null && direct.isNotEmpty) {
      return direct;
    }
    if (record is SdJwtVcRecord) {
      return _pickDisplayEntry(record.issuerMetadata?['display']);
    }
    return null;
  }

  /// Título: `display.name`. Si falta, `vct` / tipo (no es lo ideal).
  static String _title(CredentialRecord record, Map<String, dynamic>? display) {
    final named = _nameFromDisplay(display);
    if (named != null) {
      return named;
    }
    if (record is SdJwtVcRecord && record.vct.trim().isNotEmpty) {
      return record.vct.trim();
    }
    if (record is W3cCredentialRecord) {
      final type = record.types.lastOrNull;
      if (type != null && type.trim().isNotEmpty) {
        return type.trim();
      }
    }
    if (record is MdocRecord && record.docType.trim().isNotEmpty) {
      return record.docType.trim();
    }
    return 'Credencial';
  }

  /// Emisor: marca OID4VCI. Si falta, DID / `iss` crudo.
  static String? _issuer(CredentialRecord record) {
    if (record is SdJwtVcRecord) {
      final meta = record.issuerMetadata;
      final brand = _nameFromDisplay(
        _asStringKeyedMap(meta?['issuer_brand_display']),
      );
      if (brand != null) {
        return brand;
      }
      final iss = meta?['issuer'];
      if (iss is String && iss.trim().isNotEmpty) {
        return iss.trim();
      }
    }
    if (record is W3cCredentialRecord) {
      final named = _nameFromDisplay(
        _asStringKeyedMap(record.displayMetadata?['issuer']),
      );
      if (named != null) {
        return named;
      }
      final did = record.issuerDid?.trim();
      if (did != null && did.isNotEmpty) {
        return did;
      }
    }
    return null;
  }

  static Map<String, dynamic>? _pickDisplayEntry(
    dynamic display, {
    String preferredLocale = 'es',
  }) {
    if (display is Map) {
      return _asStringKeyedMap(display);
    }
    if (display is! List || display.isEmpty) {
      return null;
    }
    Map<String, dynamic>? fallback;
    final preferred = preferredLocale.toLowerCase();
    for (final entry in display) {
      final map = _asStringKeyedMap(entry);
      if (map == null) {
        continue;
      }
      fallback ??= map;
      final locale = (map['locale'] as String?)?.toLowerCase();
      if (locale == null) {
        continue;
      }
      if (locale == preferred || locale.startsWith('$preferred-')) {
        return map;
      }
    }
    return fallback;
  }

  static String? _nameFromDisplay(Map<String, dynamic>? display) {
    final name = display?['name'];
    if (name is! String) {
      return null;
    }
    final trimmed = name.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  static Map<String, dynamic>? _asStringKeyedMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }
    return null;
  }
}
