import '../../core/network/api_client.dart';

/// Solicitud de devolución del afiliado (`/me/refund-requests`).
class RefundRequest {
  /// Crea el modelo.
  RefundRequest({
    required this.id,
    required this.paymentId,
    required this.status,
    this.reason,
    this.rejectionReason,
    this.createdAt,
  });

  final String id;
  final String paymentId;
  final String status;
  final String? reason;
  final String? rejectionReason;
  final DateTime? createdAt;

  factory RefundRequest.fromJson(Map<String, dynamic> json) {
    return RefundRequest(
      id: json['id'] as String,
      paymentId: json['paymentId'] as String,
      status: json['status'] as String? ?? '',
      reason: json['reason'] as String?,
      rejectionReason: json['rejectionReason'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
    );
  }
}

/// Acceso a solicitudes de devolución del afiliado.
class RefundRepository {
  /// Crea el repositorio.
  RefundRepository(this._api);

  final ApiClient _api;

  /// Solicita devolución de un pago.
  Future<RefundRequest> requestRefund(String paymentId, {String? reason}) {
    return _api.postJson<RefundRequest>(
      '/api/me/payments/$paymentId/refund-requests',
      body: {if (reason != null && reason.isNotEmpty) 'reason': reason},
      parse: (json) {
        if (json is! Map) {
          throw ApiException('Respuesta inválida al solicitar devolución');
        }
        return RefundRequest.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }

  /// Lista mis solicitudes de devolución.
  Future<List<RefundRequest>> listMyRequests() {
    return _api.getJson<List<RefundRequest>>(
      '/api/me/refund-requests?pageSize=100',
      parse: (json) {
        final items = json is Map ? json['items'] : null;
        if (items is! List) return <RefundRequest>[];
        return items
            .whereType<Map>()
            .map((e) => RefundRequest.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      },
    );
  }
}