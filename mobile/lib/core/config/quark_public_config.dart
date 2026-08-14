/// Bases públicas Kuatia para reescribir URIs de offer/request en el device.
///
/// @remarks Con Kuatia las URIs ya suelen ser HTTPS públicas; este helper
/// corrige hosts viejos (tunnel Quark / Docker) si quedaran en offers cacheados.
abstract final class QuarkPublicConfig {
  /// Base pública del issuer (OID4VCI).
  ///
  /// Override: `--dart-define=KUATIA_ISSUER_PUBLIC_URL=https://…`
  /// (también acepta `QUARK_ISSUER_PUBLIC_URL` legacy vía mismo default).
  static const issuerPublicUrl = String.fromEnvironment(
    'KUATIA_ISSUER_PUBLIC_URL',
    defaultValue: 'https://issuer.kuatia.xyz',
  );

  /// Base pública del verifier (OID4VP).
  ///
  /// Override: `--dart-define=KUATIA_VERIFIER_PUBLIC_URL=https://…`
  static const verifierPublicUrl = String.fromEnvironment(
    'KUATIA_VERIFIER_PUBLIC_URL',
    defaultValue: 'https://verifier.kuatia.xyz',
  );

  /// Reescribe hosts internos / tunnels viejos en un [offerUri].
  static String normalizeOfferUri(String offerUri) {
    return _rewriteHosts(
      offerUri,
      issuerPublicUrl,
      const [
        'quark-issuer:9001',
        '127.0.0.1:9001',
        'localhost:9001',
        'issuer.pruebasaproduccunon.uno',
      ],
    );
  }

  /// Reescribe hosts internos / tunnels viejos en un [requestUri] OID4VP.
  static String normalizeRequestUri(String requestUri) {
    return _rewriteHosts(
      requestUri,
      verifierPublicUrl,
      const [
        'quark-verifier:9002',
        '127.0.0.1:9002',
        'localhost:9002',
        'verifier.pruebasaproduccunon.uno',
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
