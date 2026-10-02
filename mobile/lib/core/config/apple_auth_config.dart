import 'package:flutter/foundation.dart';

/// Configuración de Sign in with Apple.
///
/// Solo en iOS (login nativo). En Android el plugin necesita un flujo web
/// con Service ID que no está configurado, así que el botón no se muestra.
class AppleAuthConfig {
  AppleAuthConfig._();

  static bool get isEnabled =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;
}
