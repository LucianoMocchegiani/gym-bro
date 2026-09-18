import '../../core/network/api_client.dart';
import '../store/receipts_repository.dart';
import '../store/store_repository.dart';

String _qs(Map<String, String> params) {
  return params.entries
      .map((e) => '${e.key}=${Uri.encodeQueryComponent(e.value)}')
      .join('&');
}

List<Map<String, dynamic>> _items(Object? json) {
  final items = json is Map ? json['items'] : null;
  if (items is! List) {
    return const [];
  }
  return items
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .toList();
}

/// Pack de catálogo staff (`GET /packs`).
class StaffPack {
  /// Crea el modelo.
  StaffPack({
    required this.id,
    required this.name,
    required this.price,
    required this.billingPeriod,
    this.active = true,
  });

  final String id;
  final String name;
  final int price;
  final String billingPeriod;
  final bool active;

  factory StaffPack.fromJson(Map<String, dynamic> json) {
    return StaffPack(
      id: json['id'] as String,
      name: json['name'] as String? ?? 'Pack',
      price: (json['price'] as num?)?.toInt() ?? 0,
      billingPeriod: json['billingPeriod'] as String? ?? 'ONE_TIME',
      active: json['active'] as bool? ?? true,
    );
  }
}

/// Ítem del carrito de Caja.
class CajaCartItem {
  /// Crea el ítem.
  CajaCartItem({
    required this.key,
    required this.kind,
    required this.refId,
    required this.label,
    required this.price,
  });

  final String key;
  final String kind;
  final String refId;
  final String label;
  final int price;
}

/// Resultado CASH.
class CajaCashResult {
  /// Crea el resultado.
  CajaCashResult({required this.transactionId, this.receipt});

  final String transactionId;
  final MemberReceipt? receipt;
}

/// Mandato de débito.
class DebitMandate {
  /// Crea el modelo.
  DebitMandate({
    required this.id,
    required this.memberEmail,
    required this.packName,
    required this.status,
    this.memberName,
    this.lastError,
  });

  final String id;
  final String? memberName;
  final String memberEmail;
  final String packName;
  final String status;
  final String? lastError;

  String get memberLabel {
    final n = memberName?.trim();
    if (n != null && n.isNotEmpty) {
      return n;
    }
    return memberEmail;
  }

  factory DebitMandate.fromJson(Map<String, dynamic> json) {
    return DebitMandate(
      id: json['id'] as String,
      memberName: json['memberName'] as String?,
      memberEmail: json['memberEmail'] as String? ?? '',
      packName: json['packName'] as String? ?? 'Pack',
      status: json['status'] as String? ?? '',
      lastError: json['lastError'] as String?,
    );
  }
}

/// Vista débito de un afiliado.
class MemberDebitView {
  /// Crea el modelo.
  MemberDebitView({this.mandate, this.monthlyName, this.monthlyEndsAt});

  final DebitMandate? mandate;
  final String? monthlyName;
  final DateTime? monthlyEndsAt;

  factory MemberDebitView.fromJson(Map<String, dynamic> json) {
    final m = json['mandate'];
    final cur = json['currentMonthly'];
    return MemberDebitView(
      mandate: m is Map
          ? DebitMandate.fromJson(Map<String, dynamic>.from(m))
          : null,
      monthlyName: cur is Map ? cur['packName'] as String? : null,
      monthlyEndsAt: cur is Map && cur['endsAt'] != null
          ? DateTime.tryParse(cur['endsAt'] as String)
          : null,
    );
  }
}

/// Caja staff: catálogo, cart CASH/MP y débitos.
class StaffCajaRepository {
  /// Crea el repositorio.
  StaffCajaRepository(this._api);

  final ApiClient _api;

  /// Packs activos.
  Future<List<StaffPack>> listActivePacks() {
    return _api.getJson<List<StaffPack>>(
      '/api/packs?${_qs({'active': 'true', 'pageSize': '100'})}',
      parse: (json) => _items(json)
          .map(StaffPack.fromJson)
          .where((p) => p.active)
          .toList(),
    );
  }

  /// Precio drop-in por servicio.
  Future<Map<String, int>> dropInPrices() {
    return _api.getJson<Map<String, int>>(
      '/api/services?${_qs({'active': 'true', 'pageSize': '100'})}',
      parse: (json) {
        final map = <String, int>{};
        for (final row in _items(json)) {
          final id = row['id'] as String?;
          final price = (row['dropInPrice'] as num?)?.toInt();
          if (id != null && price != null && price > 0) {
            map[id] = price;
          }
        }
        return map;
      },
    );
  }

  /// Checkout efectivo.
  Future<CajaCashResult> startCashCart({
    required String memberId,
    required List<CajaCartItem> items,
    required String idempotencyKey,
  }) {
    return _api.postJson<CajaCashResult>(
      '/api/members/$memberId/transaction-items/cash/cart',
      body: {
        'idempotencyKey': idempotencyKey,
        'items': [
          for (final i in items) {'kind': i.kind, 'id': i.refId, 'quantity': 1},
        ],
      },
      parse: (json) {
        if (json is! Map) {
          throw ApiException('Respuesta inválida al cobrar');
        }
        final map = Map<String, dynamic>.from(json);
        MemberReceipt? receipt;
        final raw = map['receipt'];
        if (raw is Map) {
          receipt = MemberReceipt.fromJson(Map<String, dynamic>.from(raw));
        }
        return CajaCashResult(
          transactionId: map['transactionId'] as String? ?? '',
          receipt: receipt,
        );
      },
    );
  }

  /// Checkout MP (link).
  Future<MpCartCheckoutResult> startMpCart({
    required String memberId,
    required List<CajaCartItem> items,
    required String idempotencyKey,
  }) {
    return _api.postJson<MpCartCheckoutResult>(
      '/api/members/$memberId/transaction-items/mp/cart',
      body: {
        'idempotencyKey': idempotencyKey,
        'items': [
          for (final i in items) {'kind': i.kind, 'id': i.refId, 'quantity': 1},
        ],
      },
      parse: (json) {
        if (json is! Map) {
          throw ApiException('Respuesta inválida al crear el link');
        }
        return MpCartCheckoutResult.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }

  /// Comprobante de un cart aprobado.
  Future<MemberReceipt> receiptByTransaction(String transactionId) {
    return _api.getJson<MemberReceipt>(
      '/api/transactions/$transactionId/receipt',
      parse: (json) {
        if (json is! Map) {
          throw ApiException('Sin comprobante todavía');
        }
        return MemberReceipt.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }

  /// Detalle de comprobante (staff, `members.read`).
  Future<MemberReceipt> getReceipt(String receiptId) {
    return _api.getJson<MemberReceipt>(
      '/api/receipts/$receiptId',
      parse: (json) {
        if (json is! Map) {
          throw ApiException('Respuesta inválida al cargar el comprobante');
        }
        return MemberReceipt.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }

  /// Cola de mandatos.
  Future<List<DebitMandate>> listMandates({String bucket = 'due'}) {
    return _api.getJson<List<DebitMandate>>(
      '/api/debit-mandates?${_qs({'bucket': bucket, 'pageSize': '50'})}',
      parse: (json) => _items(json).map(DebitMandate.fromJson).toList(),
    );
  }

  /// Débito de un afiliado.
  Future<MemberDebitView> memberDebit(String memberId) {
    return _api.getJson<MemberDebitView>(
      '/api/members/$memberId/debit-mandate',
      parse: (json) {
        if (json is! Map) {
          return MemberDebitView();
        }
        return MemberDebitView.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }

  /// Baja el mandato.
  Future<void> cancelMandate(String mandateId) {
    return _api.postJson<void>(
      '/api/debit-mandates/$mandateId/cancel',
      parse: (_) {},
    );
  }
}
