import 'package:flutter/material.dart';
import 'package:identity_core_dart/identity_core.dart';

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

  static const neutralBackground = Color(0xFFEDEFF2);
  static const neutralForeground = Color(0xFF252B37);

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

  Color get resolvedBackground =>
      backgroundColor ?? CredentialDisplayStyle.neutralBackground;

  Color get resolvedForeground =>
      textColor ?? CredentialDisplayStyle.neutralForeground;
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
    if (direct != null && direct.isNotEmpty) return direct;
    if (record is SdJwtVcRecord) {
      final display = record.issuerMetadata?['display'];
      if (display is List && display.isNotEmpty) {
        final first = display.first;
        if (first is Map) return Map<String, dynamic>.from(first);
      }
    }
    return null;
  }

  static String _title(
    CredentialRecord record,
    Map<String, dynamic>? display,
  ) {
    final name = display?['name'] as String?;
    if (name != null && name.isNotEmpty) return name;
    if (record is SdJwtVcRecord) return record.vct.split('.').last;
    if (record is W3cCredentialRecord) {
      return record.types.lastOrNull ?? 'Credencial';
    }
    if (record is MdocRecord) return record.docType.split('.').last;
    return 'Credencial';
  }

  static String? _issuer(CredentialRecord record) {
    if (record is SdJwtVcRecord) {
      final brand = record.issuerMetadata?['issuer_brand_display'];
      if (brand is Map) {
        final n = brand['name'];
        if (n is String && n.isNotEmpty) return n;
      }
      final iss = record.issuerMetadata?['issuer'];
      if (iss is String && iss.isNotEmpty) return iss;
    }
    if (record is W3cCredentialRecord) return record.issuerDid;
    return null;
  }
}
