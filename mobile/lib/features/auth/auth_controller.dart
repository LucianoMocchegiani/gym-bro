import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import '../credentials/device_wallet_service.dart';
import 'auth_repository.dart';
import 'google_id_token.dart';
import 'apple_id_token.dart';
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
  IdentitySession? _identity;
  List<MembershipRow> _memberships = const [];
  List<String> _permissionCodes = const [];
  PasswordStatus? _passwordStatus;
  bool _ready = false;
  String? _error;
  bool _busy = false;

  /// Sesión de gym (MEMBER/STAFF) o null.
  AppSession? get session => _session;

  IdentitySession? get identity => _identity;

  List<MembershipRow> get memberships => _memberships;

  List<String> get permissionCodes => _permissionCodes;

  /// Null hasta cargarlo (Ajustes lo pide al abrir).
  PasswordStatus? get passwordStatus => _passwordStatus;

  bool get canOperateCashier =>
      _session?.profileType == 'STAFF' &&
      _permissionCodes.contains('cashier.operate');

  bool get canWriteSessions =>
      _session?.profileType == 'STAFF' &&
      _permissionCodes.contains('sessions.write');

  bool get ready => _ready;

  String? get error => _error;

  bool get busy => _busy;

  /// Hay JWT de negocio (shell socio/staff).
  bool get isAuthenticated => _session != null;

  /// Identity ok, falta elegir gym.
  bool get needsGymPicker => _identity != null && _session == null;

  bool get isStaff => _session?.profileType == 'STAFF';

  Future<bool>? _refreshInFlight;

  /// Carga sesión desde secure storage y valida el token.
  Future<void> bootstrap() async {
    _session = await _auth.restore();
    _identity = await _auth.restoreIdentity();
    if (_session != null) {
      final alive = await _auth.sessionIsAlive();
      if (!alive) {
        await _auth.logoutGym();
        _session = null;
        _permissionCodes = const [];
        _identity = await _auth.restoreIdentity();
        if (_identity != null) {
          _memberships = await _auth.listMemberships();
        }
      } else {
        await _hydratePermissions();
      }
    } else if (_identity != null) {
      final alive = await _auth.sessionIsAlive();
      if (!alive) {
        await _auth.logout();
        _identity = null;
        _memberships = const [];
      } else {
        _memberships = await _auth.listMemberships();
      }
    }
    _ready = true;
    notifyListeners();
  }

  /// Email + password de la cuenta (sin slug).
  Future<bool> login({required String email, required String password}) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      _identity = await _auth.loginIdentity(email: email, password: password);
      _session = null;
      _permissionCodes = const [];
      _memberships = await _auth.listMemberships();
      if (_memberships.length == 1) {
        _session = await _auth.selectContext(_memberships.first);
        await _hydratePermissions();
      }
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

  /// Google Sign-In → `POST /auth/google`. No toca la wallet.
  Future<bool> loginWithGoogle() async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      final idToken = await GoogleIdToken.request();
      if (idToken == null) {
        return false;
      }
      _identity = await _auth.loginGoogle(idToken: idToken);
      _session = null;
      _permissionCodes = const [];
      _memberships = await _auth.listMemberships();
      if (_memberships.length == 1) {
        _session = await _auth.selectContext(_memberships.first);
        await _hydratePermissions();
      }
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      return false;
    } catch (_) {
      _error = 'No se pudo iniciar sesión con Google';
      return false;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  /// Apple Sign-In → `POST /auth/apple`. No toca la wallet.
  Future<bool> loginWithApple() async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      final idToken = await AppleIdToken.request();
      if (idToken == null) {
        return false;
      }
      _identity = await _auth.loginApple(idToken: idToken);
      _session = null;
      _permissionCodes = const [];
      _memberships = await _auth.listMemberships();
      if (_memberships.length == 1) {
        _session = await _auth.selectContext(_memberships.first);
        await _hydratePermissions();
      }
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      return false;
    } catch (_) {
      _error = 'No se pudo iniciar sesión con Apple';
      return false;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  /// Entra a un gym de la lista. No reinicia la wallet.
  Future<bool> enterGym(MembershipRow row) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      _session = await _auth.selectContext(row);
      await _hydratePermissions();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      return false;
    } catch (_) {
      _error = 'No se pudo entrar al gym';
      return false;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  /// Vuelve al picker; la wallet de la persona queda.
  Future<void> switchGym() async {
    await _auth.logoutGym();
    _session = null;
    _permissionCodes = const [];
    _identity = await _auth.restoreIdentity();
    if (_identity != null) {
      _memberships = await _auth.listMemberships();
    }
    notifyListeners();
  }

  Future<bool> refreshIfNeeded() async {
    final inFlight = _refreshInFlight;
    if (inFlight != null) {
      return inFlight;
    }
    final future = _refreshSession();
    _refreshInFlight = future;
    try {
      return await future;
    } finally {
      _refreshInFlight = null;
    }
  }

  Future<bool> _refreshSession() async {
    final ok = await _auth.refresh();
    if (ok) {
      _session = await _auth.restore();
      _identity = await _auth.restoreIdentity();
      if (_session != null) {
        await _hydratePermissions();
      }
      notifyListeners();
      return true;
    }
    if (_session != null) {
      _session = null;
      _permissionCodes = const [];
      _identity = await _auth.restoreIdentity();
      notifyListeners();
      return _identity != null;
    }
    await _wallet?.lock();
    _identity = null;
    _memberships = const [];
    notifyListeners();
    return false;
  }

  /// Carga si la cuenta tiene contraseña y si es la temporal. Silencioso si falla.
  Future<void> loadPasswordStatus() async {
    try {
      _passwordStatus = await _auth.fetchPasswordStatus();
      notifyListeners();
    } catch (_) {
      // Ajustes muestra la fila igual, sin aviso.
    }
  }

  /// Cambia la contraseña y vuelve a entrar al mismo gym con la nueva.
  ///
  /// La API revoca todas las sesiones de la persona (RN-MIG-003), así que se
  /// re-loguea la identity y se re-elige el contexto actual.
  /// Lanza [ApiException] si la actual no es correcta.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final current = _session;
    final email = _identity?.email ?? current?.email;
    await _auth.changePassword(
      currentPassword: currentPassword,
      newPassword: newPassword,
    );
    if (email == null) {
      await logout();
      return;
    }
    _identity = await _auth.loginIdentity(email: email, password: newPassword);
    if (current != null) {
      _session = await _auth.selectContext(
        MembershipRow(
          tenantId: current.tenantId,
          tenantSlug: current.tenantSlug,
          tenantName: current.tenantSlug,
          profile: current.profileType,
        ),
      );
      await _hydratePermissions();
    } else {
      _memberships = await _auth.listMemberships();
    }
    _passwordStatus = const PasswordStatus(hasPassword: true, temporary: false);
    notifyListeners();
  }

  /// Crea contraseña (cuenta solo Google/Apple). La sesión sigue.
  Future<void> createPassword({required String newPassword}) async {
    await _auth.setPassword(newPassword: newPassword);
    _passwordStatus = const PasswordStatus(hasPassword: true, temporary: false);
    notifyListeners();
  }

  /// Elimina la cuenta Faciliter, borra la wallet del celular y cierra sesión.
  ///
  /// Si la API rechaza (p. ej. 409 dueño de gym) no toca nada local.
  Future<void> deleteAccount() async {
    await _auth.deleteAccount();
    try {
      await _wallet?.resetWallet();
    } catch (e) {
      debugPrint('No se pudo borrar la wallet al eliminar la cuenta: $e');
    }
    await logout();
  }

  /// Cierra la cuenta Faciliter y bloquea la wallet.
  Future<void> logout() async {
    await _auth.logout();
    await _wallet?.lock();
    _session = null;
    _identity = null;
    _memberships = const [];
    _permissionCodes = const [];
    _passwordStatus = null;
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
