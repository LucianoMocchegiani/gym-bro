import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import '../credentials/member_wallet_service.dart';
import 'auth_repository.dart';
import 'session_store.dart';

/// Estado de autenticación Member para la UI.
class AuthController extends ChangeNotifier {
  /// Crea el controller.
  AuthController({
    required AuthRepository auth,
    required ApiClient api,
    MemberWalletService? wallet,
  }) : _auth = auth,
       _api = api,
       _wallet = wallet {
    _api.onUnauthorized = refreshIfNeeded;
  }

  final AuthRepository _auth;
  final ApiClient _api;
  final MemberWalletService? _wallet;

  MemberSession? _session;
  bool _ready = false;
  String? _error;
  bool _busy = false;

  /// Sesión actual o null.
  MemberSession? get session => _session;

  /// Hidratación inicial terminada.
  bool get ready => _ready;

  /// Error de login/acción.
  String? get error => _error;

  /// Operación en curso.
  bool get busy => _busy;

  /// ¿Hay sesión?
  bool get isAuthenticated => _session != null;

  /// Carga sesión desde secure storage.
  Future<void> bootstrap() async {
    _session = await _auth.restore();
    _ready = true;
    notifyListeners();
  }

  /// Login afiliado.
  Future<bool> login({
    required String tenantSlug,
    required String email,
    required String password,
  }) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      _session = await _auth.login(
        tenantSlug: tenantSlug,
        email: email,
        password: password,
      );
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      return false;
    } catch (_) {
      _error = 'No se pudo iniciar sesión';
      return false;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  /// Intento de refresh ante 401.
  Future<bool> refreshIfNeeded() async {
    final ok = await _auth.refresh();
    if (ok) {
      _session = await _auth.restore();
      notifyListeners();
    } else {
      _session = null;
      notifyListeners();
    }
    return ok;
  }

  /// Cierra sesión GymBro y bloquea la wallet local.
  Future<void> logout() async {
    await _auth.logout();
    await _wallet?.lock();
    _session = null;
    notifyListeners();
  }
}
