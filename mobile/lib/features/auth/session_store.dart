import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Sesión afiliado persistida en secure storage.
class MemberSession {
  /// Crea la sesión en memoria.
  const MemberSession({
    required this.accessToken,
    required this.refreshToken,
    required this.tenantId,
    required this.tenantSlug,
    required this.userId,
    required this.email,
    this.name,
  });

  final String accessToken;
  final String refreshToken;
  final String tenantId;
  final String tenantSlug;
  final String userId;
  final String email;
  final String? name;

  /// Serializa a JSON.
  Map<String, dynamic> toJson() => {
    'accessToken': accessToken,
    'refreshToken': refreshToken,
    'tenantId': tenantId,
    'tenantSlug': tenantSlug,
    'userId': userId,
    'email': email,
    'name': name,
  };

  /// Parsea desde JSON.
  factory MemberSession.fromJson(Map<String, dynamic> json) {
    return MemberSession(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      tenantId: json['tenantId'] as String,
      tenantSlug: json['tenantSlug'] as String? ?? '',
      userId: json['userId'] as String,
      email: json['email'] as String,
      name: json['name'] as String?,
    );
  }

  /// Copia con tokens nuevos.
  MemberSession copyWithTokens({
    required String accessToken,
    required String refreshToken,
  }) {
    return MemberSession(
      accessToken: accessToken,
      refreshToken: refreshToken,
      tenantId: tenantId,
      tenantSlug: tenantSlug,
      userId: userId,
      email: email,
      name: name,
    );
  }
}

/// Persistencia de sesión Member (RN-ROL-005).
class SessionStore {
  /// Crea el store.
  SessionStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'gymbro.member.session';
  final FlutterSecureStorage _storage;

  /// Lee sesión o null.
  Future<MemberSession?> read() async {
    final raw = await _storage.read(key: _key);
    if (raw == null || raw.isEmpty) {
      return null;
    }
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      return MemberSession.fromJson(map);
    } catch (_) {
      await clear();
      return null;
    }
  }

  /// Guarda sesión.
  Future<void> write(MemberSession session) async {
    await _storage.write(key: _key, value: jsonEncode(session.toJson()));
  }

  /// Borra sesión.
  Future<void> clear() async {
    await _storage.delete(key: _key);
  }
}
