import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import '../credentials/device_wallet_service.dart';
import 'auth_repository.dart';
import 'session_store.dart';

/// Estado de autenticación de la app para la UI.
class AuthController extends ChangeNotifier {
  /// Crea el controller.
  AuthController({
    required AuthRepository auth,
    required ApiClient api,
    DeviceWalletService? wallet,
  }) : _auth = auth,
       _api = api,
       _wallet = wallet {
    _api.onUnauthorized = refreshIfNeeded;
  }

  final AuthRepository _auth;
  final ApiClient _api;
  final DeviceWalletService? _wallet;

  AppSession? _session;
  List<String> _permissionCodes = const [];
  bool _ready = false;
  String? _error;
  bool _busy = false;

  /// Sesión actual o null.
  AppSession? get session => _session;

  /// Permisos staff (vacío en afiliado).
  List<String> get permissionCodes => _permissionCodes;

  /// Caja en Inicio staff (RN-ROL-009 / `cashier.operate`).
  bool get canOperateCashier =>
      _session?.profileType == 'STAFF' &&
      _permissionCodes.contains('cashier.operate');

  /// Hidratación inicial terminada.
  bool get ready => _ready;

  /// Error de login/acción.
  String? get error => _error;

  /// Operación en curso.
  bool get busy => _busy;

  /// ¿Hay sesión?
  bool get isAuthenticated => _session != null;

  /// ¿Perfil staff?
  bool get isStaff => _session?.profileType == 'STAFF';

  /// Carga sesión desde secure storage.
  Future<void> bootstrap() async {
    _session = await _auth.restore();
    await _hydratePermissions();
    _ready = true;
    notifyListeners();
  }

  /// Login afiliado o staff (`MEMBER` / `STAFF`).
  Future<bool> login({
    required String tenantSlug,
    required String email,
    required String password,
    required String profileType,
  }) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      if (profileType == 'STAFF') {
        _session = await _auth.loginStaff(
          tenantSlug: tenantSlug,
          email: email,
          password: password,
        );
      } else {
        _session = await _auth.loginMember(
          tenantSlug: tenantSlug,
          email: email,
          password: password,
        );
      }
      await _hydratePermissions();
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
      await _hydratePermissions();
      notifyListeners();
    } else {
      _session = null;
      _permissionCodes = const [];
      notifyListeners();
    }
    return ok;
  }

  /// Cierra sesión GymBro y bloquea la wallet local.
  Future<void> logout() async {
    await _auth.logout();
    await _wallet?.lock();
    _session = null;
    _permissionCodes = const [];
    notifyListeners();
  }

  Future<void> _hydratePermissions() async {
    if (_session?.profileType != 'STAFF') {
      _permissionCodes = const [];
      return;
    }
    try {
      _permissionCodes = await _auth.fetchPermissionCodes();
    } catch (_) {
      _permissionCodes = const [];
    }
  }
}
