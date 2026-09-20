import '../../core/network/api_client.dart';
import 'session_store.dart';

/// Respuesta de login GymBro (identity o gym).
class AuthTokensResponse {
  /// Parsea tokens + user.
  AuthTokensResponse({
    required this.accessToken,
    required this.refreshToken,
    required this.profileType,
    required this.userId,
    required this.email,
    this.tenantId,
    this.name,
  });

  final String accessToken;
  final String refreshToken;
  final String profileType;
  final String userId;
  final String email;
  final String? tenantId;
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
      tenantId: user['tenantId'] as String?,
    );
  }
}

/// Fila del picker de gym.
class MembershipRow {
  /// Parsea un ítem de `GET /auth/memberships`.
  MembershipRow({
    required this.tenantId,
    required this.tenantSlug,
    required this.tenantName,
    required this.profile,
    this.memberId,
    this.staffUserId,
  });

  final String tenantId;
  final String tenantSlug;
  final String tenantName;
  final String profile;
  final String? memberId;
  final String? staffUserId;

  factory MembershipRow.fromJson(Map<String, dynamic> json) {
    return MembershipRow(
      tenantId: json['tenantId'] as String,
      tenantSlug: json['tenantSlug'] as String,
      tenantName: json['tenantName'] as String,
      profile: json['profile'] as String,
      memberId: json['memberId'] as String?,
      staffUserId: json['staffUserId'] as String?,
    );
  }

  String get roleLabel => profile == 'STAFF' ? 'Staff' : 'Socio';
}

/// Auth contra Nest (identity + contexto de gym).
class AuthRepository {
  /// Crea el repositorio.
  AuthRepository({required ApiClient api, required SessionStore store})
      : _api = api,
        _store = store;

  final ApiClient _api;
  final SessionStore _store;

  /// Login de persona (`POST /auth/identity/login`).
  Future<IdentitySession> loginIdentity({
    required String email,
    required String password,
  }) async {
    final tokens = await _api.postJson<AuthTokensResponse>(
      '/api/auth/identity/login',
      auth: false,
      body: {
        'email': email.trim(),
        'password': password,
      },
      parse: (json) =>
          AuthTokensResponse.fromJson(json! as Map<String, dynamic>),
    );
    return _persistIdentity(tokens);
  }

  /// Login de persona (`POST /auth/google`) con `id_token`.
  Future<IdentitySession> loginGoogle({required String idToken}) async {
    final tokens = await _api.postJson<AuthTokensResponse>(
      '/api/auth/google',
      auth: false,
      body: {'idToken': idToken},
      parse: (json) =>
          AuthTokensResponse.fromJson(json! as Map<String, dynamic>),
    );
    return _persistIdentity(tokens);
  }

  Future<IdentitySession> _persistIdentity(AuthTokensResponse tokens) async {
    if (tokens.profileType != 'IDENTITY') {
      throw ApiException('Se requiere sesión de cuenta');
    }
    final identity = IdentitySession(
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      identityId: tokens.userId,
      email: tokens.email,
      name: tokens.name,
    );
    await _store.writeIdentity(identity);
    await _store.clearGym();
    _api.accessToken = identity.accessToken;
    return identity;
  }

  /// Gyms de la identity actual.
  Future<List<MembershipRow>> listMemberships() async {
    final identity = await _store.readIdentity();
    if (identity == null) {
      return const [];
    }
    _api.accessToken = identity.accessToken;
    return _api.getJson<List<MembershipRow>>(
      '/api/auth/memberships',
      parse: (json) {
        if (json is! Map) {
          return const [];
        }
        final items = json['items'];
        if (items is! List) {
          return const [];
        }
        return [
          for (final item in items)
            if (item is Map)
              MembershipRow.fromJson(Map<String, dynamic>.from(item)),
        ];
      },
    );
  }

  /// Emite JWT de negocio y lo persiste.
  Future<AppSession> selectContext(MembershipRow row) async {
    final identity = await _store.readIdentity();
    if (identity == null) {
      throw ApiException('Iniciá sesión');
    }
    _api.accessToken = identity.accessToken;
    final tokens = await _api.postJson<AuthTokensResponse>(
      '/api/auth/select-context',
      body: {
        'tenantId': row.tenantId,
        'profile': row.profile,
      },
      parse: (json) =>
          AuthTokensResponse.fromJson(json! as Map<String, dynamic>),
    );
    final tenantId = tokens.tenantId;
    if (tenantId == null ||
        (tokens.profileType != 'MEMBER' && tokens.profileType != 'STAFF')) {
      throw ApiException('No se pudo entrar al gym');
    }
    final session = AppSession(
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tenantId: tenantId,
      tenantSlug: row.tenantSlug,
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

  Future<AppSession?> restore() async {
    final session = await _store.read();
    if (session != null) {
      _api.accessToken = session.accessToken;
    }
    return session;
  }

  Future<IdentitySession?> restoreIdentity() async {
    final identity = await _store.readIdentity();
    if (identity != null && await _store.read() == null) {
      _api.accessToken = identity.accessToken;
    }
    return identity;
  }

  /// ¿El access token responde en `GET /auth/me`?
  Future<bool> sessionIsAlive() async {
    try {
      await _api.getJson<void>('/api/auth/me', parse: (_) {});
      return true;
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        return false;
      }
      return await _store.read() != null || await _store.readIdentity() != null;
    }
  }

  /// Refresca el JWT activo (gym si hay, si no identity).
  Future<bool> refresh() async {
    final gym = await _store.read();
    if (gym != null) {
      return _refreshGym(gym);
    }
    final identity = await _store.readIdentity();
    if (identity != null) {
      return _refreshIdentity(identity);
    }
    return false;
  }

  Future<bool> _refreshGym(AppSession current) async {
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
      await logoutGym();
      return false;
    }
  }

  Future<bool> _refreshIdentity(IdentitySession current) async {
    try {
      final tokens = await _api.postJson<AuthTokensResponse>(
        '/api/auth/refresh',
        auth: false,
        body: {'refreshToken': current.refreshToken},
        parse: (json) =>
            AuthTokensResponse.fromJson(json! as Map<String, dynamic>),
      );
      if (tokens.profileType != 'IDENTITY') {
        await logout();
        return false;
      }
      final next = current.copyWithTokens(
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      );
      await _store.writeIdentity(next);
      _api.accessToken = next.accessToken;
      return true;
    } catch (_) {
      await logout();
      return false;
    }
  }

  /// Sale del gym; conserva la identity (picker). No toca la wallet.
  Future<void> logoutGym() async {
    final current = await _store.read();
    if (current != null) {
      try {
        await _api.postJson<void>(
          '/api/auth/logout',
          auth: false,
          body: {'refreshToken': current.refreshToken},
          parse: (_) {},
        );
      } catch (_) {}
    }
    await _store.clearGym();
    final identity = await _store.readIdentity();
    _api.accessToken = identity?.accessToken;
  }

  /// Cierra identity + gym.
  Future<void> logout() async {
    final gym = await _store.read();
    final identity = await _store.readIdentity();
    for (final token in [gym?.refreshToken, identity?.refreshToken]) {
      if (token == null) {
        continue;
      }
      try {
        await _api.postJson<void>(
          '/api/auth/logout',
          auth: false,
          body: {'refreshToken': token},
          parse: (_) {},
        );
      } catch (_) {}
    }
    await _store.clear();
    _api.accessToken = null;
  }
}
