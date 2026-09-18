import '../../core/network/api_client.dart';
import 'session_store.dart';

/// Respuesta de login GymBro (afiliado o staff).
class AuthTokensResponse {
  /// Parsea tokens + user.
  AuthTokensResponse({
    required this.accessToken,
    required this.refreshToken,
    required this.profileType,
    required this.userId,
    required this.email,
    required this.tenantId,
    this.name,
  });

  final String accessToken;
  final String refreshToken;
  final String profileType;
  final String userId;
  final String email;
  final String tenantId;
  final String? name;

  factory AuthTokensResponse.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>;
    return AuthTokensResponse(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      profileType: json['profileType'] as String,
      userId: user['id'] as String,
      email: user['email'] as String,
      name: user['name'] as String?,
      tenantId: user['tenantId'] as String,
    );
  }
}

/// Auth contra Nest (RN-ROL-005).
class AuthRepository {
  /// Crea el repositorio.
  AuthRepository({required ApiClient api, required SessionStore store})
    : _api = api,
      _store = store;

  final ApiClient _api;
  final SessionStore _store;

  /// Login afiliado (`POST /auth/member/login`).
  Future<AppSession> loginMember({
    required String tenantSlug,
    required String email,
    required String password,
  }) {
    return _login(
      path: '/api/auth/member/login',
      expectedProfile: 'MEMBER',
      tenantSlug: tenantSlug,
      email: email,
      password: password,
    );
  }

  /// Login staff (`POST /auth/staff/login`).
  Future<AppSession> loginStaff({
    required String tenantSlug,
    required String email,
    required String password,
  }) {
    return _login(
      path: '/api/auth/staff/login',
      expectedProfile: 'STAFF',
      tenantSlug: tenantSlug,
      email: email,
      password: password,
    );
  }

  Future<AppSession> _login({
    required String path,
    required String expectedProfile,
    required String tenantSlug,
    required String email,
    required String password,
  }) async {
    final tokens = await _api.postJson<AuthTokensResponse>(
      path,
      auth: false,
      body: {
        'tenantSlug': tenantSlug.trim().toLowerCase(),
        'email': email.trim(),
        'password': password,
      },
      parse: (json) =>
          AuthTokensResponse.fromJson(json! as Map<String, dynamic>),
    );
    if (tokens.profileType != expectedProfile) {
      throw ApiException(
        expectedProfile == 'STAFF'
            ? 'Se requiere perfil staff'
            : 'Se requiere perfil afiliado',
      );
    }
    final session = AppSession(
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tenantId: tokens.tenantId,
      tenantSlug: tenantSlug.trim().toLowerCase(),
      userId: tokens.userId,
      email: tokens.email,
      name: tokens.name,
      profileType: tokens.profileType,
    );
    await _store.write(session);
    _api.accessToken = session.accessToken;
    return session;
  }

  /// Permisos efectivos (`GET /me/permissions`). Solo staff.
  Future<List<String>> fetchPermissionCodes() async {
    return _api.getJson<List<String>>(
      '/api/me/permissions',
      parse: (json) {
        if (json is! Map) {
          return const <String>[];
        }
        final codes = json['permissionCodes'];
        if (codes is! List) {
          return const <String>[];
        }
        return codes.whereType<String>().toList();
      },
    );
  }

  /// Restaura sesión desde storage.
  Future<AppSession?> restore() async {
    final session = await _store.read();
    if (session != null) {
      _api.accessToken = session.accessToken;
    }
    return session;
  }

  /// Refresca tokens; false si falla.
  Future<bool> refresh() async {
    final current = await _store.read();
    if (current == null) {
      return false;
    }
    try {
      final tokens = await _api.postJson<AuthTokensResponse>(
        '/api/auth/refresh',
        auth: false,
        body: {'refreshToken': current.refreshToken},
        parse: (json) =>
            AuthTokensResponse.fromJson(json! as Map<String, dynamic>),
      );
      final next = current.copyWithTokens(
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      );
      await _store.write(next);
      _api.accessToken = next.accessToken;
      return true;
    } catch (_) {
      await logout();
      return false;
    }
  }

  /// Logout local + revoca refresh si puede.
  Future<void> logout() async {
    final current = await _store.read();
    if (current != null) {
      try {
        await _api.postJson<void>(
          '/api/auth/logout',
          auth: false,
          body: {'refreshToken': current.refreshToken},
          parse: (_) {},
        );
      } catch (_) {
        // Cierre local igual.
      }
    }
    await _store.clear();
    _api.accessToken = null;
  }
}
