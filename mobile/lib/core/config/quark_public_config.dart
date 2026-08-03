/// Config de red / Quark pública (tunnel).
abstract final class QuarkPublicConfig {
  /// Base pública del issuer (offers OID4VCI).
  ///
  /// Override: `--dart-define=QUARK_ISSUER_PUBLIC_URL=https://…`
  static const issuerPublicUrl = String.fromEnvironment(
    'QUARK_ISSUER_PUBLIC_URL',
    defaultValue: 'https://issuer.pruebasaproduccunon.uno',
  );

  /// Reescribe hosts Docker internos en un [offerUri] para el device.
  ///
  /// Ofers viejos pueden traer `http://quark-issuer:9001`; el tunnel usa HTTPS público.
  static String normalizeOfferUri(String offerUri) {
    final public = issuerPublicUrl.replaceAll(RegExp(r'/$'), '');
    var out = offerUri;
    // Texto plano y percent-encoding típico de credential_offer_uri.
    final replacements = <String, String>{
      'http://quark-issuer:9001': public,
      'https://quark-issuer:9001': public,
      'http://127.0.0.1:9001': public,
      'http://localhost:9001': public,
      'http%3A%2F%2Fquark-issuer%3A9001': Uri.encodeComponent(public),
      'https%3A%2F%2Fquark-issuer%3A9001': Uri.encodeComponent(public),
      'http%3A%2F%2F127.0.0.1%3A9001': Uri.encodeComponent(public),
      'http%3A%2F%2Flocalhost%3A9001': Uri.encodeComponent(public),
    };
    replacements.forEach((from, to) {
      out = out.replaceAll(from, to);
    });
    return out;
  }
}
