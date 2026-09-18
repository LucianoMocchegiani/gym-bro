import '../../core/network/api_client.dart';
import 'credential_offers_repository.dart';

/// Offers de acceso del staff autenticado (`GET /me/staff-credential-offers`).
class StaffCredentialOffersRepository {
  /// Crea el repositorio.
  StaffCredentialOffersRepository(this._api);

  final ApiClient _api;

  /// Solo `PENDING` con URI (bandeja Acceso).
  Future<List<CredentialOfferItem>> listPending() async {
    final all = await _api.getJson<List<CredentialOfferItem>>(
      '/api/me/staff-credential-offers',
      parse: (json) {
        final items = json is Map ? json['items'] : null;
        if (items is! List) {
          return <CredentialOfferItem>[];
        }
        return items
            .whereType<Map>()
            .map(
              (e) => _fromStaffJson(Map<String, dynamic>.from(e)),
            )
            .toList();
      },
    );
    return all.where((o) => o.canAccept).toList();
  }

  /// Confirma en GymBro que el offer quedó aceptado en wallet.
  Future<CredentialOfferItem> markAccepted(String offerId) {
    return _api.postJson<CredentialOfferItem>(
      '/api/me/staff-credential-offers/$offerId/accept',
      parse: (json) {
        if (json is! Map) {
          throw ApiException('Respuesta inválida al aceptar offer');
        }
        return _fromStaffJson(Map<String, dynamic>.from(json));
      },
    );
  }

  /// Marca el offer `FAILED` tras OID4VCI vencido/inválido.
  Future<CredentialOfferItem> markFailed(
    String offerId, {
    String? reason,
  }) {
    return _api.postJson<CredentialOfferItem>(
      '/api/me/staff-credential-offers/$offerId/fail',
      body: {
        if (reason != null && reason.isNotEmpty) 'reason': reason,
      },
      parse: (json) {
        if (json is! Map) {
          throw ApiException('Respuesta inválida al marcar offer FAILED');
        }
        return _fromStaffJson(Map<String, dynamic>.from(json));
      },
    );
  }

  CredentialOfferItem _fromStaffJson(Map<String, dynamic> json) {
    final createdAt = DateTime.parse(json['createdAt'] as String);
    final name = (json['staffName'] as String?)?.trim();
    return CredentialOfferItem(
      id: json['id'] as String,
      status: json['status'] as String,
      packId: json['staffUserId'] as String? ?? '',
      packName: (name != null && name.isNotEmpty)
          ? name
          : 'Acceso staff',
      contractId: json['staffUserId'] as String? ?? '',
      offerUri: json['offerUri'] as String?,
      validFrom: createdAt,
      validUntil: null,
      createdAt: createdAt,
    );
  }
}
