/// Configuración de la API para la app afiliado.
///
/// Override en runtime:
/// `flutter run --dart-define=API_BASE_URL=https://...`
class ApiConfig {
  ApiConfig._();

  /// Base del API Nest (sin slash final). Incluye host; paths usan `/api/...`.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.faciliter.xyz',
  );
}
