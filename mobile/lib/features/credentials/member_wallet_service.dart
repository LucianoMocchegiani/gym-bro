import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:identity_core_dart/identity_core.dart';
import 'package:path_provider/path_provider.dart';

import '../../core/config/quark_public_config.dart';

/// Wallet holder local (OID4VCI) con secreto device-bound.
///
/// @remarks El secreto NO se deriva del password GymBro ni se sube al backend
/// (docs/12). Se usa como PIN de [WalletService] (Argon2id interno del SDK).
class MemberWalletService {
  /// Crea el servicio.
  MemberWalletService({
    FlutterSecureStorage? storage,
    WalletService? walletService,
  }) : _storage = storage ?? const FlutterSecureStorage(),
       _walletService = walletService ?? WalletService();

  static const _walletId = 'gymbro-member';
  static const _secretKey = 'gymbro.wallet.secret';

  final FlutterSecureStorage _storage;
  final WalletService _walletService;
  WalletSession? _session;

  /// Sesión desbloqueada o null.
  WalletSession? get session => _session;

  /// Asegura create/unlock y deja [session] lista.
  Future<WalletSession> ensureUnlocked() async {
    if (_session != null && !_session!.isLocked) {
      return _session!;
    }
    final pin = await _readOrCreateSecret();
    final dir = await getApplicationDocumentsDirectory();
    try {
      _session = await _walletService.unlock(
        walletId: _walletId,
        pin: pin,
        directory: dir.path,
      );
    } on WalletNotFoundError {
      _session = await _walletService.create(
        walletId: _walletId,
        pin: pin,
        directory: dir.path,
      );
    }
    return _session!;
  }

  /// Resuelve el offer y adquiere la VC (pre-authorized).
  ///
  /// Normaliza hosts Docker → URL pública del tunnel antes de llamar al SDK.
  Future<int> acceptOffer(String offerUri) async {
    final session = await ensureUnlocked();
    final normalized = QuarkPublicConfig.normalizeOfferUri(offerUri);
    final offer = await session.openid4vci.resolveOffer(normalized);
    final result = await session.openid4vci.acquireCredentials(
      resolvedOffer: offer,
    );
    return result.credentials.length;
  }

  /// Bloquea la sesión (logout opcional).
  Future<void> lock() async {
    await _walletService.lock();
    _session = null;
  }

  Future<String> _readOrCreateSecret() async {
    final existing = await _storage.read(key: _secretKey);
    if (existing != null && existing.length >= 16) {
      return existing;
    }
    final bytes = List<int>.generate(
      32,
      (_) => Random.secure().nextInt(256),
    );
    final secret = base64UrlEncode(bytes);
    await _storage.write(key: _secretKey, value: secret);
    if (kDebugMode) {
      debugPrint('MemberWalletService: secreto wallet generado (device-bound)');
    }
    return secret;
  }
}
