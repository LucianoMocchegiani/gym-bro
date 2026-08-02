import '../../core/network/api_client.dart';
import 'session_store.dart';

/// Respuesta de login Member.
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

/// Auth afiliado contra Nest.
class AuthRepository {
  /// Crea el repositorio.
  AuthRepository({required ApiClient api, required SessionStore store})
    : _api = api,
      _store = store;

  final ApiClient _api;
  final SessionStore _store;

  /// Login por slug de gym + email/password.
  Future<MemberSession> login({
    required String tenantSlug,
    required String email,
    required String password,
  }) async {
    final tokens = await _api.postJson<AuthTokensResponse>(
      '/api/auth/member/login',
      auth: false,
      body: {
        'tenantSlug': tenantSlug.trim().toLowerCase(),
        'email': email.trim(),
        'password': password,
      },
      parse: (json) =>
          AuthTokensResponse.fromJson(json! as Map<String, dynamic>),
    );
    if (tokens.profileType != 'MEMBER') {
      throw ApiException('Se requiere perfil afiliado');
    }
    final session = MemberSession(
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tenantId: tokens.tenantId,
      tenantSlug: tenantSlug.trim().toLowerCase(),
      userId: tokens.userId,
      email: tokens.email,
      name: tokens.name,
    );
    await _store.write(session);
    _api.accessToken = session.accessToken;
    return session;
  }

  /// Restaura sesión desde storage.
  Future<MemberSession?> restore() async {
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
