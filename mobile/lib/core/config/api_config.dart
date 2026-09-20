/// Configuración de la API Nest para la app.
///
/// Default: API pública. Local: `--dart-define=API_BASE_URL=http://localhost:3001`
/// y en USB `adb reverse tcp:3001 tcp:3001`.
class ApiConfig {
  ApiConfig._();

  /// Base del API Nest (sin slash final). Incluye host; paths usan `/api/...`.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.faciliter.xyz',
  );
}
