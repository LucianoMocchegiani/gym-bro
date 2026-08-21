import '../../core/network/api_client.dart';

/// Pack disponible para compra (`GET /me/packs`).
class MemberPack {
  /// Crea el modelo.
  MemberPack({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.billingPeriod,
    required this.kind,
    required this.components,
    this.creditsExpireAt,
  });

  final String id;
  final String name;
  final String? description;
  final int price;
  final String billingPeriod;
  final String kind;
  final List<MemberPackComponent> components;
  final DateTime? creditsExpireAt;

  factory MemberPack.fromJson(Map<String, dynamic> json) {
    final components = (json['components'] as List<dynamic>? ?? [])
        .whereType<Map>()
        .map((e) => MemberPackComponent.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    return MemberPack(
      id: json['id'] as String,
      name: json['name'] as String? ?? 'Pack',
      description: json['description'] as String?,
      price: (json['price'] as num?)?.toInt() ?? 0,
      billingPeriod: json['billingPeriod'] as String? ?? 'ONE_TIME',
      kind: json['kind'] as String? ?? 'ACCESS',
      components: components,
      creditsExpireAt: json['creditsExpireAt'] != null
          ? DateTime.tryParse(json['creditsExpireAt'] as String)
          : null,
    );
  }

  String get billingLabel =>
      billingPeriod == 'MONTHLY' ? 'Mensual' : 'Único';
}

/// Componente de un pack (servicio incluido).
class MemberPackComponent {
  /// Crea el modelo.
  MemberPackComponent({
    required this.serviceId,
    required this.serviceName,
    required this.serviceType,
    this.creditAmount,
  });

  final String serviceId;
  final String serviceName;
  final String serviceType;
  final int? creditAmount;

  factory MemberPackComponent.fromJson(Map<String, dynamic> json) {
    return MemberPackComponent(
      serviceId: json['serviceId'] as String,
      serviceName: json['serviceName'] as String? ?? 'Servicio',
      serviceType: json['serviceType'] as String? ?? 'ACCESO_LIBRE',
      creditAmount: (json['creditAmount'] as num?)?.toInt(),
    );
  }
}

/// Resultado de checkout MP para un pack (`POST /me/payments/mp/checkout`).
class PackCheckoutResult {
  /// Crea el modelo.
  PackCheckoutResult({
    required this.paymentId,
    required this.status,
    required this.amount,
    required this.checkoutUrl,
  });

  final String paymentId;
  final String status;
  final int amount;
  final String? checkoutUrl;

  factory PackCheckoutResult.fromJson(Map<String, dynamic> json) {
    final url = (json['checkoutUrl'] as String?)?.trim();
    final sandbox = (json['sandboxCheckoutUrl'] as String?)?.trim();
    final resolved = (url != null && url.isNotEmpty)
        ? url
        : (sandbox != null && sandbox.isNotEmpty ? sandbox : null);
    return PackCheckoutResult(
      paymentId: json['paymentId'] as String,
      status: json['status'] as String? ?? '',
      amount: (json['amount'] as num?)?.toInt() ?? 0,
      checkoutUrl: resolved,
    );
  }
}

/// Acceso a catálogo de packs y checkout MP del afiliado.
class StoreRepository {
  /// Crea el repositorio.
  StoreRepository(this._api);

  final ApiClient _api;

  /// Estado de conexión de Mercado Pago del gym.
  Future<bool> getMpConnected() {
    return _api.getJson<bool>(
      '/api/me/mp-status',
      parse: (json) {
        if (json is Map) return json['connected'] as bool? ?? false;
        return false;
      },
    );
  }

  /// Packs activos visibles para el afiliado.
  Future<List<MemberPack>> listPacks() {
    return _api.getJson<List<MemberPack>>(
      '/api/me/packs',
      parse: (json) {
        if (json is! List) return <MemberPack>[];
        return json
            .whereType<Map>()
            .map((e) => MemberPack.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      },
    );
  }

  /// Inicia checkout MP para comprar un pack.
  Future<PackCheckoutResult> startPackCheckout(String packId) {
    return _api.postJson<PackCheckoutResult>(
      '/api/me/payments/mp/checkout',
      body: {'packId': packId},
      parse: (json) {
        if (json is! Map) {
          throw ApiException('Respuesta inválida al iniciar checkout');
        }
        return PackCheckoutResult.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }
}