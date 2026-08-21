import '../../core/network/api_client.dart';

/// Sesión publicada visible para el afiliado (`GET /me/sessions`).
class MemberSession {
  /// Crea el modelo.
  MemberSession({
    required this.id,
    required this.serviceId,
    required this.serviceName,
    required this.branchName,
    required this.instructorName,
    required this.startsAt,
    required this.endsAt,
    required this.capacity,
    required this.bookedCount,
    required this.slotsLeft,
    required this.hasSlots,
    required this.dropInPrice,
  });

  final String id;
  final String serviceId;
  final String serviceName;
  final String? branchName;
  final String? instructorName;
  final DateTime startsAt;
  final DateTime endsAt;
  final int capacity;
  final int bookedCount;
  final int slotsLeft;
  final bool hasSlots;
  final int? dropInPrice;

  /// ¿Ya empezó la sesión?
  bool get started => startsAt.isBefore(DateTime.now());

  factory MemberSession.fromJson(Map<String, dynamic> json) {
    return MemberSession(
      id: json['id'] as String,
      serviceId: json['serviceId'] as String,
      serviceName: json['serviceName'] as String? ?? 'Sesión',
      branchName: json['branchName'] as String?,
      instructorName: json['instructorName'] as String?,
      startsAt: DateTime.parse(json['startsAt'] as String),
      endsAt: DateTime.parse(json['endsAt'] as String),
      capacity: json['capacity'] as int? ?? 0,
      bookedCount: json['bookedCount'] as int? ?? 0,
      slotsLeft: json['slotsLeft'] as int? ?? 0,
      hasSlots: json['hasSlots'] as bool? ?? false,
      dropInPrice: (json['dropInPrice'] as num?)?.toInt(),
    );
  }
}

/// Reserva propia (`GET/POST/PATCH /me/reservations`).
class MemberReservation {
  /// Crea el modelo.
  MemberReservation({
    required this.id,
    required this.sessionId,
    required this.serviceName,
    required this.sessionStartsAt,
    required this.status,
    required this.coverage,
  });

  final String id;
  final String sessionId;
  final String serviceName;
  final DateTime sessionStartsAt;
  final String status;
  final String coverage;

  factory MemberReservation.fromJson(Map<String, dynamic> json) {
    return MemberReservation(
      id: json['id'] as String,
      sessionId: json['sessionId'] as String,
      serviceName: json['serviceName'] as String? ?? 'Sesión',
      sessionStartsAt: DateTime.parse(json['sessionStartsAt'] as String),
      status: json['status'] as String? ?? '',
      coverage: json['coverage'] as String? ?? 'CREDIT',
    );
  }
}

/// Ítem de lista de espera propio (`/me/waitlist`).
class WaitlistEntry {
  /// Crea el modelo.
  WaitlistEntry({
    required this.id,
    required this.sessionId,
    required this.serviceName,
    required this.sessionStartsAt,
    required this.status,
    required this.position,
  });

  final String id;
  final String sessionId;
  final String serviceName;
  final DateTime sessionStartsAt;
  final String status;
  final int? position;

  factory WaitlistEntry.fromJson(Map<String, dynamic> json) {
    return WaitlistEntry(
      id: json['id'] as String,
      sessionId: json['sessionId'] as String,
      serviceName: json['serviceName'] as String? ?? 'Sesión',
      sessionStartsAt: DateTime.parse(json['sessionStartsAt'] as String),
      status: json['status'] as String? ?? '',
      position: (json['position'] as num?)?.toInt(),
    );
  }
}

/// Resultado de checkout drop-in MP (`POST /me/payments/mp/drop-in-checkout`).
class DropInCheckout {
  /// Crea el modelo.
  DropInCheckout({
    required this.paymentId,
    required this.status,
    required this.amount,
    required this.checkoutUrl,
  });

  final String paymentId;
  final String status;
  final int amount;

  /// Link usable para abrir MP (prioriza `checkoutUrl`, cae en sandbox).
  final String? checkoutUrl;

  factory DropInCheckout.fromJson(Map<String, dynamic> json) {
    final url = (json['checkoutUrl'] as String?)?.trim();
    final sandbox = (json['sandboxCheckoutUrl'] as String?)?.trim();
    final resolved = (url != null && url.isNotEmpty)
        ? url
        : (sandbox != null && sandbox.isNotEmpty ? sandbox : null);
    return DropInCheckout(
      paymentId: json['paymentId'] as String,
      status: json['status'] as String? ?? '',
      amount: (json['amount'] as num?)?.toInt() ?? 0,
      checkoutUrl: resolved,
    );
  }
}

/// Lista paginada de sesiones (`GET /me/sessions`).
class SessionPage {
  /// Crea el modelo.
  SessionPage({
    required this.items,
    required this.total,
    required this.hasMore,
  });

  final List<MemberSession> items;
  final int total;
  final bool hasMore;
}

/// Acceso al catálogo de sesiones, reservas y waitlist del afiliado.
class SessionsRepository {
  /// Crea el repositorio.
  SessionsRepository(this._api);

  final ApiClient _api;

  /// Sesiones publicadas próximas (`GET /me/sessions`).
  Future<SessionPage> listSessions({int page = 1, int pageSize = 50}) {
    return _api.getJson<SessionPage>(
      '/api/me/sessions?page=$page&pageSize=$pageSize',
      parse: (json) {
        final map = json is Map ? json : <String, dynamic>{};
        final items = (map['items'] as List<dynamic>? ?? [])
            .whereType<Map>()
            .map((e) => MemberSession.fromJson(Map<String, dynamic>.from(e)))
            .toList();
        return SessionPage(
          items: items,
          total: (map['total'] as num?)?.toInt() ?? items.length,
          hasMore: map['hasMore'] as bool? ?? false,
        );
      },
    );
  }

  /// Reserva la sesión consumiendo 1 crédito del servicio.
  Future<MemberReservation> reserve(String sessionId) {
    return _api.postJson<MemberReservation>(
      '/api/me/reservations',
      body: {'sessionId': sessionId},
      parse: (json) {
        if (json is! Map) {
          throw ApiException('Respuesta inválida al reservar');
        }
        return MemberReservation.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }

  /// Cancela una reserva propia.
  Future<MemberReservation> cancelReservation(String reservationId) {
    return _api.patchJson<MemberReservation>(
      '/api/me/reservations/$reservationId/status',
      body: {'status': 'CANCELLED'},
      parse: (json) {
        if (json is! Map) {
          throw ApiException('Respuesta inválida al cancelar reserva');
        }
        return MemberReservation.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }

  /// Mis reservas (`GET /me/reservations`).
  Future<List<MemberReservation>> listReservations() {
    return _api.getJson<List<MemberReservation>>(
      '/api/me/reservations?pageSize=100',
      parse: (json) {
        final items = json is Map ? json['items'] : null;
        if (items is! List) {
          return <MemberReservation>[];
        }
        return items
            .whereType<Map>()
            .map(
              (e) => MemberReservation.fromJson(Map<String, dynamic>.from(e)),
            )
            .toList();
      },
    );
  }

  /// Me une a la lista de espera de una sesión llena.
  Future<WaitlistEntry> joinWaitlist(String sessionId) {
    return _api.postJson<WaitlistEntry>(
      '/api/me/waitlist',
      body: {'sessionId': sessionId},
      parse: (json) {
        if (json is! Map) {
          throw ApiException('Respuesta inválida al unirse a la lista');
        }
        return WaitlistEntry.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }

  /// Salgo de la lista de espera.
  Future<WaitlistEntry> leaveWaitlist(String entryId) {
    return _api.patchJson<WaitlistEntry>(
      '/api/me/waitlist/$entryId/status',
      body: {'status': 'LEFT'},
      parse: (json) {
        if (json is! Map) {
          throw ApiException('Respuesta inválida al salir de la lista');
        }
        return WaitlistEntry.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }

  /// Mi lista de espera (`GET /me/waitlist`).
  Future<List<WaitlistEntry>> listWaitlist() {
    return _api.getJson<List<WaitlistEntry>>(
      '/api/me/waitlist?pageSize=100',
      parse: (json) {
        final items = json is Map ? json['items'] : null;
        if (items is! List) {
          return <WaitlistEntry>[];
        }
        return items
            .whereType<Map>()
            .map((e) => WaitlistEntry.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      },
    );
  }

  /// Inicia checkout MP para drop-in (pago único de la sesión).
  Future<DropInCheckout> startDropIn(String sessionId) {
    return _api.postJson<DropInCheckout>(
      '/api/me/payments/mp/drop-in-checkout',
      body: {'sessionId': sessionId},
      parse: (json) {
        if (json is! Map) {
          throw ApiException('Respuesta inválida al iniciar checkout');
        }
        return DropInCheckout.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }
}