/// Client ID Web de Google (audience del `id_token`).
///
/// Default = cliente Web de Faciliter (no es secreto; va en el APK).
/// Override: `flutter run --dart-define=GOOGLE_SERVER_CLIENT_ID=…`
class GoogleAuthConfig {
  GoogleAuthConfig._();

  static const String serverClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
    defaultValue:
        '382351831666-vtubuvqok9bq2p3s2bdbpe6iifrvue16.apps.googleusercontent.com',
  );

  static bool get isEnabled => serverClientId.isNotEmpty;
}
