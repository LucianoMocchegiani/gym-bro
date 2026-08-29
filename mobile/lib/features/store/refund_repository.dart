import '../../core/network/api_client.dart';

/// Acceso a solicitudes de devolución del afiliado.
class RefundRepository {
  /// Crea el repositorio.
  RefundRepository(this._api);

  final ApiClient _api;

  /// Solicita devolución de un pago.
  Future<RefundRequest> requestRefund(String transactionItemId, {String? reason}) {
    return _api.postJson<RefundRequest>(
      '/api/me/transaction-items/$transactionItemId/refund-requests',
      body: {if (reason != null && reason.isNotEmpty) 'reason': reason},
      parse: (json) {
        if (json is! Map) {
          throw ApiException('Respuesta inválida al solicitar devolución');
        }
        return RefundRequest.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }
}

/// Solicitud de devolución del afiliado (`/me/refund-requests`).
class RefundRequest {
  /// Crea el modelo.
  RefundRequest({
    required this.id,
    required this.transactionItemId,
    required this.status,
    this.reason,
    this.rejectionReason,
    this.createdAt,
  });

  final String id;
  final String transactionItemId;
  final String status;
  final String? reason;
  final String? rejectionReason;
  final DateTime? createdAt;

  factory RefundRequest.fromJson(Map<String, dynamic> json) {
    return RefundRequest(
      id: json['id'] as String,
      transactionItemId: json['transactionItemId'] as String,
      status: json['status'] as String? ?? '',
      reason: json['reason'] as String?,
      rejectionReason: json['rejectionReason'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
    );
  }
}