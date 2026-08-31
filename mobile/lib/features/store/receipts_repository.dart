import '../../core/network/api_client.dart';

/// Servicio incluido en un pack del comprobante.
class PaymentLineService {
  /// Crea el modelo.
  PaymentLineService({required this.name, this.credits});

  final String name;
  final int? credits;

  factory PaymentLineService.fromJson(Map<String, dynamic> json) {
    return PaymentLineService(
      name: json['name'] as String? ?? 'Servicio',
      credits: (json['credits'] as num?)?.toInt(),
    );
  }
}

/// Línea comercial de un cart (`ReceiptDetail.lines`).
class PaymentLine {
  /// Crea el modelo.
  PaymentLine({
    required this.id,
    required this.kind,
    required this.title,
    required this.amount,
    required this.status,
    this.outcome,
    this.contractStartsAt,
    this.contractEndsAt,
    this.sessionStartsAt,
    this.sessionEndsAt,
    this.branchName,
    this.services = const [],
  });

  final String id;
  final String kind;
  final String title;
  final int amount;
  final String status;
  final String? outcome;
  final DateTime? contractStartsAt;
  final DateTime? contractEndsAt;
  final DateTime? sessionStartsAt;
  final DateTime? sessionEndsAt;
  final String? branchName;
  final List<PaymentLineService> services;

  factory PaymentLine.fromJson(Map<String, dynamic> json) {
    final contract = json['contract'];
    final session = json['session'];
    final services = (json['services'] as List<dynamic>? ?? [])
        .whereType<Map>()
        .map((e) => PaymentLineService.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    return PaymentLine(
      id: json['id'] as String,
      kind: json['kind'] as String? ?? 'PACK',
      title: json['title'] as String? ?? 'Ítem',
      amount: (json['amount'] as num?)?.toInt() ?? 0,
      status: json['status'] as String? ?? 'APPROVED',
      outcome: json['outcome'] as String?,
      contractStartsAt: contract is Map && contract['startsAt'] != null
          ? DateTime.tryParse(contract['startsAt'] as String)
          : null,
      contractEndsAt: contract is Map && contract['endsAt'] != null
          ? DateTime.tryParse(contract['endsAt'] as String)
          : null,
      sessionStartsAt: session is Map && session['startsAt'] != null
          ? DateTime.tryParse(session['startsAt'] as String)
          : null,
      sessionEndsAt: session is Map && session['endsAt'] != null
          ? DateTime.tryParse(session['endsAt'] as String)
          : null,
      branchName: session is Map ? session['branchName'] as String? : null,
      services: services,
    );
  }
}

/// Comprobante interno del afiliado (`GET /me/receipts`).
///
/// Un cobro de carrito = un comprobante (RN-PAG-009), igual que en Admin.
class MemberReceipt {
  /// Crea el modelo.
  MemberReceipt({
    required this.id,
    required this.code,
    required this.amount,
    required this.method,
    required this.concept,
    required this.createdAt,
    this.transactionId,
    this.description,
    this.lines = const [],
  });

  final String id;
  final String code;
  final int amount;
  final String method;
  final String concept;
  final DateTime createdAt;
  final String? transactionId;
  final String? description;
  final List<PaymentLine> lines;

  factory MemberReceipt.fromJson(Map<String, dynamic> json) {
    final lines = (json['lines'] as List<dynamic>? ?? [])
        .whereType<Map>()
        .map((e) => PaymentLine.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    return MemberReceipt(
      id: json['id'] as String,
      code: json['code'] as String? ?? 'GB',
      amount: (json['amount'] as num?)?.toInt() ?? 0,
      method: json['method'] as String? ?? '',
      concept: json['concept'] as String? ?? 'PACK_CONTRACT',
      createdAt: DateTime.parse(json['createdAt'] as String),
      transactionId: json['transactionId'] as String?,
      description: json['description'] as String?,
      lines: lines,
    );
  }

  /// ¿Es un comprobante de cobro (no de devolución ejecutada)?
  bool get isCharge => concept != 'REFUND';
}

/// Acceso a comprobantes propios (`GET /me/receipts`).
class ReceiptsRepository {
  /// Crea el repositorio.
  ReceiptsRepository(this._api);

  final ApiClient _api;

  /// Lista comprobantes del afiliado (más recientes primero).
  Future<List<MemberReceipt>> listMine({int pageSize = 50}) {
    return _api.getJson<List<MemberReceipt>>(
      '/api/me/receipts?page=1&pageSize=$pageSize&order=desc',
      parse: (json) {
        final items = json is Map ? json['items'] : null;
        if (items is! List) return <MemberReceipt>[];
        return items
            .whereType<Map>()
            .map((e) => MemberReceipt.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      },
    );
  }

  /// Detalle de un comprobante propio (líneas del cart).
  Future<MemberReceipt> getMine(String receiptId) {
    return _api.getJson<MemberReceipt>(
      '/api/me/receipts/$receiptId',
      parse: (json) {
        if (json is! Map) {
          throw ApiException('Respuesta inválida al cargar el comprobante');
        }
        return MemberReceipt.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }
}
