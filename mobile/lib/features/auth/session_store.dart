import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Sesión GymBro persistida (afiliado o staff). No es la clase de calendario.
class AppSession {
  /// Crea la sesión en memoria.
  const AppSession({
    required this.accessToken,
    required this.refreshToken,
    required this.tenantId,
    required this.tenantSlug,
    required this.userId,
    required this.email,
    required this.profileType,
    this.name,
  });

  final String accessToken;
  final String refreshToken;
  final String tenantId;
  final String tenantSlug;
  final String userId;
  final String email;
  final String? name;

  /// `MEMBER` o `STAFF` (JWT GymBro).
  final String profileType;

  /// Serializa a JSON.
  Map<String, dynamic> toJson() => {
    'accessToken': accessToken,
    'refreshToken': refreshToken,
    'tenantId': tenantId,
    'tenantSlug': tenantSlug,
    'userId': userId,
    'email': email,
    'name': name,
    'profileType': profileType,
  };

  /// Parsea desde JSON.
  factory AppSession.fromJson(Map<String, dynamic> json) {
    return AppSession(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      tenantId: json['tenantId'] as String,
      tenantSlug: json['tenantSlug'] as String? ?? '',
      userId: json['userId'] as String,
      email: json['email'] as String,
      name: json['name'] as String?,
      profileType: json['profileType'] as String? ?? 'MEMBER',
    );
  }

  /// Copia con tokens nuevos.
  AppSession copyWithTokens({
    required String accessToken,
    required String refreshToken,
  }) {
    return AppSession(
      accessToken: accessToken,
      refreshToken: refreshToken,
      tenantId: tenantId,
      tenantSlug: tenantSlug,
      userId: userId,
      email: email,
      name: name,
      profileType: profileType,
    );
  }
}

/// Persistencia de [AppSession] (RN-ROL-005).
class SessionStore {
  /// Crea el store.
  SessionStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'faciliter.app.session';
  final FlutterSecureStorage _storage;

  /// Lee sesión o null.
  Future<AppSession?> read() async {
    final raw = await _storage.read(key: _key);
    if (raw == null || raw.isEmpty) {
      return null;
    }
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      return AppSession.fromJson(map);
    } catch (_) {
      await clear();
      return null;
    }
  }

  /// Guarda sesión.
  Future<void> write(AppSession session) async {
    await _storage.write(key: _key, value: jsonEncode(session.toJson()));
  }

  /// Borra sesión.
  Future<void> clear() async {
    await _storage.delete(key: _key);
  }
}
