import '../../core/network/api_client.dart';

/// Credencial de vínculo (stub E6).
class AccessCredential {
  AccessCredential({
    required this.credentialRef,
    required this.presentationToken,
    required this.venueToken,
    required this.status,
    required this.issuedAt,
  });

  final String credentialRef;
  final String presentationToken;
  final String venueToken;
  final String status;
  final DateTime issuedAt;

  factory AccessCredential.fromJson(Map<String, dynamic> json) {
    return AccessCredential(
      credentialRef: json['credentialRef'] as String,
      presentationToken: json['presentationToken'] as String,
      venueToken: json['venueToken'] as String,
      status: json['status'] as String,
      issuedAt: DateTime.parse(json['issuedAt'] as String),
    );
  }
}

/// Resultado de check-in / verify (CU-ACC-001).
class AccessCheckInResult {
  AccessCheckInResult({
    required this.allowed,
    required this.reasonCode,
    this.memberId,
  });

  final bool allowed;
  final String reasonCode;
  final String? memberId;

  factory AccessCheckInResult.fromJson(Map<String, dynamic> json) {
    return AccessCheckInResult(
      allowed: json['allowed'] as bool? ?? false,
      reasonCode: json['reasonCode'] as String? ?? '',
      memberId: json['memberId'] as String?,
    );
  }
}

/// Credencial + check-in Member.
class AccessRepository {
  AccessRepository(this._api);

  final ApiClient _api;

  /// Credencial ACTIVE o null si 404.
  Future<AccessCredential?> getActive() async {
    try {
      return await _api.getJson(
        '/api/me/access-credential',
        parse: (json) =>
            AccessCredential.fromJson(json! as Map<String, dynamic>),
      );
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        return null;
      }
      rethrow;
    }
  }

  /// Emite / reemite credencial.
  Future<AccessCredential> issue() {
    return _api.postJson(
      '/api/me/access-credential/issue',
      parse: (json) => AccessCredential.fromJson(json! as Map<String, dynamic>),
    );
  }

  /// Check-in al escanear el QR del local (modo B).
  Future<AccessCheckInResult> checkIn({required String venueToken}) {
    return _api.postJson(
      '/api/me/access/check-in',
      body: {'venueToken': venueToken},
      parse: (json) =>
          AccessCheckInResult.fromJson(json! as Map<String, dynamic>),
    );
  }
}

/// Extrae `stub-venue:…` de un QR (texto plano o con ruido).
String? parseVenueToken(String raw) {
  final text = raw.trim();
  if (text.isEmpty) {
    return null;
  }
  final match = RegExp(r'stub-venue:[0-9a-fA-F-]{36}').firstMatch(text);
  if (match != null) {
    return match.group(0);
  }
  if (text.startsWith('stub-venue:')) {
    return text;
  }
  return null;
}
