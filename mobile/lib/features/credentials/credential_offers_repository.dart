import '../../core/network/api_client.dart';

/// Offer OID4VCI pendiente (respuesta slim de GymBro).
class CredentialOfferItem {
  /// Crea el modelo.
  CredentialOfferItem({
    required this.id,
    required this.status,
    required this.packId,
    required this.packName,
    required this.contractId,
    required this.offerUri,
    required this.validFrom,
    required this.validUntil,
    required this.createdAt,
  });

  final String id;
  final String status;
  final String packId;
  final String packName;
  final String contractId;
  final String? offerUri;
  final DateTime validFrom;
  final DateTime? validUntil;
  final DateTime createdAt;

  /// Parsea un ítem del listado.
  factory CredentialOfferItem.fromJson(Map<String, dynamic> json) {
    return CredentialOfferItem(
      id: json['id'] as String,
      status: json['status'] as String,
      packId: json['packId'] as String,
      packName: json['packName'] as String? ?? '',
      contractId: json['contractId'] as String,
      offerUri: json['offerUri'] as String?,
      validFrom: DateTime.parse(json['validFrom'] as String),
      validUntil: json['validUntil'] != null
          ? DateTime.parse(json['validUntil'] as String)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  /// ¿Listo para aceptar en wallet?
  bool get canAccept =>
      status == 'PENDING' && offerUri != null && offerUri!.isNotEmpty;
}

/// Lista offers del afiliado (`GET /me/credential-offers`).
class CredentialOffersRepository {
  /// Crea el repositorio.
  CredentialOffersRepository(this._api);

  final ApiClient _api;

  /// Solo `PENDING` con URI (bandeja).
  Future<List<CredentialOfferItem>> listPending() async {
    final all = await _api.getJson<List<CredentialOfferItem>>(
      '/api/me/credential-offers',
      parse: (json) {
        final items = json is Map ? json['items'] : null;
        if (items is! List) {
          return <CredentialOfferItem>[];
        }
        return items
            .whereType<Map>()
            .map(
              (e) => CredentialOfferItem.fromJson(
                Map<String, dynamic>.from(e),
              ),
            )
            .toList();
      },
    );
    return all.where((o) => o.canAccept).toList();
  }

  /// Confirma en GymBro que el offer quedó aceptado en wallet (`ACCEPTED`).
  ///
  /// Llamar solo tras OID4VCI con ≥1 credencial. Idempotente en API.
  Future<CredentialOfferItem> markAccepted(String offerId) {
    return _api.postJson<CredentialOfferItem>(
      '/api/me/credential-offers/$offerId/accept',
      parse: (json) {
        if (json is! Map) {
          throw ApiException('Respuesta inválida al aceptar offer');
        }
        return CredentialOfferItem.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }

  /// Marca el offer `FAILED` tras OID4VCI vencido/inválido (sale de bandeja).
  ///
  /// Conserva `offerUri` en API; [reason] va a `lastError` (staff).
  Future<CredentialOfferItem> markFailed(
    String offerId, {
    String? reason,
  }) {
    return _api.postJson<CredentialOfferItem>(
      '/api/me/credential-offers/$offerId/fail',
      body: {
        if (reason != null && reason.isNotEmpty) 'reason': reason,
      },
      parse: (json) {
        if (json is! Map) {
          throw ApiException('Respuesta inválida al marcar offer FAILED');
        }
        return CredentialOfferItem.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }
}
