/// Config de red / Quark pública (tunnel).
abstract final class QuarkPublicConfig {
  /// Base pública del issuer (offers OID4VCI).
  ///
  /// Override: `--dart-define=QUARK_ISSUER_PUBLIC_URL=https://…`
  static const issuerPublicUrl = String.fromEnvironment(
    'QUARK_ISSUER_PUBLIC_URL',
    defaultValue: 'https://issuer.pruebasaproduccunon.uno',
  );

  /// Base pública del verifier (requests OID4VP).
  ///
  /// Override: `--dart-define=QUARK_VERIFIER_PUBLIC_URL=https://…`
  static const verifierPublicUrl = String.fromEnvironment(
    'QUARK_VERIFIER_PUBLIC_URL',
    defaultValue: 'https://verifier.pruebasaproduccunon.uno',
  );

  /// Reescribe hosts Docker internos en un [offerUri] para el device.
  ///
  /// Ofers viejos pueden traer `http://quark-issuer:9001`; el tunnel usa HTTPS público.
  static String normalizeOfferUri(String offerUri) {
    return _rewriteHosts(
      offerUri,
      issuerPublicUrl,
      const [
        'quark-issuer:9001',
        '127.0.0.1:9001',
        'localhost:9001',
      ],
    );
  }

  /// Reescribe hosts Docker internos en un [requestUri] OID4VP.
  static String normalizeRequestUri(String requestUri) {
    return _rewriteHosts(
      requestUri,
      verifierPublicUrl,
      const [
        'quark-verifier:9002',
        '127.0.0.1:9002',
        'localhost:9002',
      ],
    );
  }

  static String _rewriteHosts(
    String input,
    String publicBase,
    List<String> hosts,
  ) {
    final public = publicBase.replaceAll(RegExp(r'/$'), '');
    var out = input;
    for (final host in hosts) {
      out = out.replaceAll('http://$host', public);
      out = out.replaceAll('https://$host', public);
      out = out.replaceAll(
        Uri.encodeComponent('http://$host'),
        Uri.encodeComponent(public),
      );
      out = out.replaceAll(
        Uri.encodeComponent('https://$host'),
        Uri.encodeComponent(public),
      );
    }
    return out;
  }
}
