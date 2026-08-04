import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:identity_core_dart/identity_core.dart';
import 'package:path_provider/path_provider.dart';

import '../../core/config/quark_public_config.dart';

/// Resultado de escanear un QR SSI (OID4VCI u OID4VP).
enum WalletScanKind { oid4vci, oid4vp }

/// Payload de [MemberWalletService.handleScannedInvitation].
class WalletScanResult {
  /// Crea el resultado VCI.
  const WalletScanResult.vci({
    required this.credentialsAcquired,
    this.offerUri,
  })  : kind = WalletScanKind.oid4vci,
        presentationOk = false,
        errorMessage = null;

  /// Crea resultado de presentación.
  const WalletScanResult.vp({
    required this.presentationOk,
    this.errorMessage,
  })  : kind = WalletScanKind.oid4vp,
        credentialsAcquired = 0,
        offerUri = null;

  final WalletScanKind kind;
  final int credentialsAcquired;
  final String? offerUri;
  final bool presentationOk;
  final String? errorMessage;
}

/// QR no reconocido como OID4VCI / OID4VP.
class UnsupportedInvitationException implements Exception {
  /// Crea la excepción.
  UnsupportedInvitationException(this.message);
  final String message;

  @override
  String toString() => message;
}

/// Wallet holder local (OID4VCI / OID4VP) con secreto device-bound.
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

  /// Asegura create/unlock y deja la sesión lista.
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

  /// Stream reactivo de VCs.
  Stream<List<CredentialRecord>> watchCredentials() async* {
    final session = await ensureUnlocked();
    yield* session.credentialStore.watch();
  }

  /// Snapshot one-shot de VCs (p. ej. pull-to-refresh).
  Future<List<CredentialRecord>> listCredentials() async {
    final session = await ensureUnlocked();
    return session.credentialStore.getAll();
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

  /// Procesa un QR: offer OID4VCI o solicitud OID4VP.
  Future<WalletScanResult> handleScannedInvitation(String raw) async {
    final session = await ensureUnlocked();
    final canonical = InvitationParser.canonicalizeForResolve(raw.trim());
    final type = InvitationParser.detectType(canonical);

    if (type == InvitationType.openid4vciOffer) {
      final normalized = QuarkPublicConfig.normalizeOfferUri(canonical);
      final count = await acceptOffer(normalized);
      return WalletScanResult.vci(
        credentialsAcquired: count,
        offerUri: normalized,
      );
    }

    if (type == InvitationType.openid4vpRequest) {
      final normalized = QuarkPublicConfig.normalizeRequestUri(canonical);
      final request = await session.openid4vp.resolveRequest(normalized);
      if (!request.submission.areAllSatisfied) {
        return const WalletScanResult.vp(
          presentationOk: false,
          errorMessage:
              'No tenés una credencial que cumpla lo pedido por el gym.',
        );
      }
      final selected = <String, String>{};
      final disclosures = <String, List<String>>{};
      for (final entry in request.submission.entries) {
        final matching = entry.matchingCredentials;
        if (matching == null || matching.isEmpty) {
          return const WalletScanResult.vp(
            presentationOk: false,
            errorMessage: 'Faltan credenciales para presentar.',
          );
        }
        selected[entry.inputDescriptorId] = matching.first.id;
        final paths = entry.requestedClaimPaths;
        if (paths != null && paths.isNotEmpty) {
          disclosures[entry.inputDescriptorId] = paths;
        }
      }
      final result = await session.openid4vp.shareCredentials(
        resolvedRequest: request,
        selectedCredentials: selected,
        selectedDisclosures: disclosures,
      );
      return WalletScanResult.vp(
        presentationOk: result.success,
        errorMessage: result.error,
      );
    }

    throw UnsupportedInvitationException(
      'Este QR no es de ingreso ni de credencial. Pedile al gym el QR correcto.',
    );
  }

  /// Bloquea la wallet (p. ej. al cerrar sesión).
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
