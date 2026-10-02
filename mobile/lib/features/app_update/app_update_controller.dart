import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/network/api_client.dart';

/// Resultado del chequeo de versión.
enum AppUpdateStatus {
  /// Todavía no terminó el chequeo.
  checking,

  /// Versión al día, o no se pudo consultar (no se bloquea sin red).
  upToDate,

  /// Hay versión nueva; se sugiere actualizar sin bloquear.
  suggested,

  /// Build por debajo del mínimo: la app no deja seguir.
  required,
}

/// Política de versiones que devuelve `GET /api/public/app-config` para
/// esta plataforma.
class AppVersionPolicy {
  /// Crea la política.
  const AppVersionPolicy({
    required this.minBuild,
    required this.latestBuild,
    this.storeUrl,
  });

  /// Parsea el bloque de una plataforma; null si falta.
  static AppVersionPolicy? fromJson(Object? json) {
    if (json is! Map<String, dynamic>) return null;
    return AppVersionPolicy(
      minBuild: (json['minBuild'] as num?)?.toInt() ?? 0,
      latestBuild: (json['latestBuild'] as num?)?.toInt() ?? 0,
      storeUrl: json['storeUrl'] as String?,
    );
  }

  /// Debajo de este build se bloquea.
  final int minBuild;

  /// Debajo de este build se sugiere actualizar.
  final int latestBuild;

  /// Ficha de la tienda, si ya existe.
  final String? storeUrl;
}

/// Decide al abrir si la app está al día, sugiere o exige actualizar.
///
/// Compara el build instalado (`+N` del pubspec) con la política de la API.
/// Sin red, timeout o plataforma sin tienda: [AppUpdateStatus.upToDate]
/// (nunca bloquea por no poder consultar). La sugerencia se muestra una sola
/// vez por `latestBuild`.
class AppUpdateController extends ChangeNotifier {
  /// Crea el controller.
  AppUpdateController({required ApiClient api}) : _api = api;

  static const _dismissedKey = 'faciliter.update.suggestedShown';
  static const _timeout = Duration(seconds: 4);

  final ApiClient _api;

  AppUpdateStatus _status = AppUpdateStatus.checking;
  AppVersionPolicy? _policy;

  /// Estado actual.
  AppUpdateStatus get status => _status;

  /// `true` cuando terminó el chequeo (con o sin éxito).
  bool get ready => _status != AppUpdateStatus.checking;

  /// Ficha de la tienda para el botón "Actualizar".
  String? get storeUrl => _policy?.storeUrl;

  /// Consulta la política y fija [status]. No lanza.
  Future<void> check() async {
    _status = await _resolve();
    notifyListeners();
  }

  Future<AppUpdateStatus> _resolve() async {
    final platform = _platformKey();
    if (platform == null) return AppUpdateStatus.upToDate;
    try {
      final results = await Future.wait([
        PackageInfo.fromPlatform(),
        _api.getJson<Object?>('/api/public/app-config', auth: false),
      ]).timeout(_timeout);
      final build = int.tryParse((results[0] as PackageInfo).buildNumber) ?? 0;
      final config = results[1];
      _policy = AppVersionPolicy.fromJson(
        config is Map<String, dynamic> ? config[platform] : null,
      );
      final policy = _policy;
      if (policy == null || build == 0) return AppUpdateStatus.upToDate;
      if (build < policy.minBuild) return AppUpdateStatus.required;
      if (build < policy.latestBuild &&
          await _suggestionPending(policy.latestBuild)) {
        return AppUpdateStatus.suggested;
      }
      return AppUpdateStatus.upToDate;
    } catch (e) {
      debugPrint('Chequeo de versión omitido: $e');
      return AppUpdateStatus.upToDate;
    }
  }

  /// Marca la sugerencia de esta versión como vista (no vuelve a aparecer
  /// hasta que haya un `latestBuild` mayor).
  Future<void> markSuggestionShown() async {
    final latest = _policy?.latestBuild;
    if (_status != AppUpdateStatus.suggested || latest == null) return;
    _status = AppUpdateStatus.upToDate;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_dismissedKey, latest);
  }

  Future<bool> _suggestionPending(int latestBuild) async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getInt(_dismissedKey) ?? 0) < latestBuild;
  }

  String? _platformKey() {
    if (kIsWeb) return null;
    return switch (defaultTargetPlatform) {
      TargetPlatform.android => 'android',
      TargetPlatform.iOS => 'ios',
      _ => null,
    };
  }
}
