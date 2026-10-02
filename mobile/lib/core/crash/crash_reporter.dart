import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';

/// Reporte de crashes con Firebase Crashlytics.
///
/// Solo corre en release y si el build tiene la config nativa de Firebase
/// (`google-services.json` / `GoogleService-Info.plist`). Sin ella la app
/// arranca igual y no reporta nada.
///
/// Nunca se envían tokens, mails, nombres ni DNI: el usuario se identifica
/// con el id opaco de la Identity.
class CrashReporter {
  CrashReporter._();

  static bool _enabled = false;

  /// `true` si Crashlytics quedó inicializado.
  static bool get enabled => _enabled;

  /// Muestra el botón de crash de prueba en Ajustes
  /// (`--dart-define=CRASH_TEST=true`).
  static const bool crashTestEnabled = bool.fromEnvironment('CRASH_TEST');

  /// Inicializa Firebase y engancha los handlers globales de errores.
  static Future<void> init() async {
    if (!kReleaseMode) return;
    try {
      await Firebase.initializeApp();
    } catch (e) {
      debugPrint('Crashlytics apagado: $e');
      return;
    }
    final crashlytics = FirebaseCrashlytics.instance;
    await crashlytics.setCrashlyticsCollectionEnabled(true);
    FlutterError.onError = crashlytics.recordFlutterFatalError;
    PlatformDispatcher.instance.onError = (error, stack) {
      crashlytics.recordError(error, stack, fatal: true);
      return true;
    };
    _enabled = true;
  }

  /// Asocia los próximos reportes a la sesión actual (o la limpia si es null).
  static Future<void> setUser({
    String? identityId,
    String? profileType,
    String? tenantId,
  }) async {
    if (!_enabled) return;
    final crashlytics = FirebaseCrashlytics.instance;
    await crashlytics.setUserIdentifier(identityId ?? '');
    await crashlytics.setCustomKey('profile_type', profileType ?? 'none');
    await crashlytics.setCustomKey('tenant_id', tenantId ?? 'none');
  }

  /// Fuerza un crash nativo para verificar que llega a la consola.
  static void testCrash() {
    if (!_enabled) return;
    FirebaseCrashlytics.instance.crash();
  }
}
