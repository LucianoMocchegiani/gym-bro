import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Sesión de persona (sin gym). Wallet SSI se ata a esta cuenta.
class IdentitySession {
  /// Crea la sesión de identity.
  const IdentitySession({
    required this.accessToken,
    required this.refreshToken,
    required this.identityId,
    required this.email,
    this.name,
  });

  final String accessToken;
  final String refreshToken;
  final String identityId;
  final String email;
  final String? name;

  Map<String, dynamic> toJson() => {
        'accessToken': accessToken,
        'refreshToken': refreshToken,
        'identityId': identityId,
        'email': email,
        'name': name,
        'profileType': 'IDENTITY',
      };

  factory IdentitySession.fromJson(Map<String, dynamic> json) {
    return IdentitySession(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      identityId: json['identityId'] as String,
      email: json['email'] as String,
      name: json['name'] as String?,
    );
  }

  IdentitySession copyWithTokens({
    required String accessToken,
    required String refreshToken,
  }) {
    return IdentitySession(
      accessToken: accessToken,
      refreshToken: refreshToken,
      identityId: identityId,
      email: email,
      name: name,
    );
  }
}

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

  /// `MEMBER` o `STAFF` (JWT GymBro de negocio).
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

/// Persistencia de [AppSession] y [IdentitySession].
class SessionStore {
  /// Crea el store.
  SessionStore({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const _gymKey = 'faciliter.app.session';
  static const _identityKey = 'faciliter.identity.session';
  final FlutterSecureStorage _storage;

  /// Lee sesión de gym o null.
  Future<AppSession?> read() async {
    final raw = await _storage.read(key: _gymKey);
    if (raw == null || raw.isEmpty) {
      return null;
    }
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      if (map['profileType'] == 'IDENTITY') {
        await clearGym();
        return null;
      }
      return AppSession.fromJson(map);
    } catch (_) {
      await clearGym();
      return null;
    }
  }

  /// Guarda sesión de gym.
  Future<void> write(AppSession session) async {
    await _storage.write(key: _gymKey, value: jsonEncode(session.toJson()));
  }

  /// Borra solo el JWT de negocio.
  Future<void> clearGym() async {
    await _storage.delete(key: _gymKey);
  }

  /// Borra gym + identity.
  Future<void> clear() async {
    await _storage.delete(key: _gymKey);
    await _storage.delete(key: _identityKey);
  }

  Future<IdentitySession?> readIdentity() async {
    final raw = await _storage.read(key: _identityKey);
    if (raw == null || raw.isEmpty) {
      return null;
    }
    try {
      return IdentitySession.fromJson(
        jsonDecode(raw) as Map<String, dynamic>,
      );
    } catch (_) {
      await _storage.delete(key: _identityKey);
      return null;
    }
  }

  Future<void> writeIdentity(IdentitySession session) async {
    await _storage.write(
      key: _identityKey,
      value: jsonEncode(session.toJson()),
    );
  }
}
