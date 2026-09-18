import '../../core/network/api_client.dart';

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

/// Sesión staff (`GET /sessions`).
class StaffSession {
  /// Crea el modelo.
  StaffSession({
    required this.id,
    required this.serviceId,
    required this.serviceName,
    required this.startsAt,
    required this.endsAt,
    required this.capacity,
    required this.bookedCount,
    this.branchName,
    this.instructorName,
    this.status = 'PUBLISHED',
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
  final String status;

  int get slotsLeft => (capacity - bookedCount).clamp(0, capacity);

  factory StaffSession.fromJson(Map<String, dynamic> json) {
    return StaffSession(
      id: json['id'] as String,
      serviceId: json['serviceId'] as String,
      serviceName: json['serviceName'] as String? ?? 'Sesión',
      branchName: json['branchName'] as String?,
      instructorName: json['instructorName'] as String?,
      startsAt: DateTime.parse(json['startsAt'] as String),
      endsAt: DateTime.parse(json['endsAt'] as String),
      capacity: json['capacity'] as int? ?? 0,
      bookedCount: json['bookedCount'] as int? ?? 0,
      status: json['status'] as String? ?? 'PUBLISHED',
    );
  }
}

/// Reserva en roster staff.
class StaffReservation {
  /// Crea el modelo.
  StaffReservation({
    required this.id,
    required this.memberId,
    required this.memberEmail,
    required this.status,
    required this.coverage,
    this.memberName,
  });

  final String id;
  final String memberId;
  final String? memberName;
  final String memberEmail;
  final String status;
  final String coverage;

  String get displayName {
    final n = memberName?.trim();
    if (n != null && n.isNotEmpty) {
      return n;
    }
    return memberEmail;
  }

  factory StaffReservation.fromJson(Map<String, dynamic> json) {
    return StaffReservation(
      id: json['id'] as String,
      memberId: json['memberId'] as String,
      memberName: json['memberName'] as String?,
      memberEmail: json['memberEmail'] as String? ?? '',
      status: json['status'] as String? ?? '',
      coverage: json['coverage'] as String? ?? 'CREDIT',
    );
  }
}

/// Afiliado en búsqueda (`GET /members`).
class StaffMemberHit {
  /// Crea el modelo.
  StaffMemberHit({required this.id, required this.email, this.name});

  final String id;
  final String email;
  final String? name;

  /// Nombre para el input (como la web: nombre o email).
  String get displayName {
    final n = name?.trim();
    if (n != null && n.isNotEmpty) {
      return n;
    }
    return email;
  }

  String get label {
    final n = name?.trim();
    if (n != null && n.isNotEmpty) {
      return '$n · $email';
    }
    return email;
  }

  factory StaffMemberHit.fromJson(Map<String, dynamic> json) {
    return StaffMemberHit(
      id: json['id'] as String,
      email: json['email'] as String? ?? '',
      name: json['name'] as String?,
    );
  }
}

/// Página de búsqueda de afiliados.
class StaffMemberSearchPage {
  /// Crea la página.
  StaffMemberSearchPage({
    required this.items,
    required this.page,
    required this.total,
    required this.hasMore,
  });

  final List<StaffMemberHit> items;
  final int page;
  final int total;
  final bool hasMore;
}

/// Calendario y roster staff (`sessions.write` / `reservations.write`).
class StaffSessionsRepository {
  /// Crea el repositorio.
  StaffSessionsRepository(this._api);

  final ApiClient _api;

  /// Sesiones publicadas en un rango.
  Future<List<StaffSession>> listPublished({
    required DateTime from,
    required DateTime to,
  }) async {
    final items = <StaffSession>[];
    var page = 1;
    var hasMore = true;
    while (hasMore && page <= 10) {
      final json = await _api.getJson<Map<String, dynamic>>(
        '/api/sessions?${_qs({'page': '$page', 'pageSize': '100', 'status': 'PUBLISHED', 'from': from.toUtc().toIso8601String(), 'to': to.toUtc().toIso8601String(), 'orderBy': 'startsAt', 'order': 'asc'})}',
        parse: (raw) => Map<String, dynamic>.from(raw is Map ? raw : {}),
      );
      items.addAll(_items(json).map(StaffSession.fromJson));
      hasMore = json['hasMore'] as bool? ?? false;
      page++;
    }
    return items;
  }

  /// Roster de una clase.
  Future<List<StaffReservation>> listRoster(String sessionId) {
    return _api.getJson<List<StaffReservation>>(
      '/api/sessions/$sessionId/reservations?${_qs({'status': 'CONFIRMED', 'pageSize': '100'})}',
      parse: (json) => _items(json).map(StaffReservation.fromJson).toList(),
    );
  }

  /// Reserva con crédito a nombre del afiliado.
  Future<StaffReservation> bookCredit({
    required String memberId,
    required String sessionId,
  }) {
    return _api.postJson<StaffReservation>(
      '/api/members/$memberId/reservations',
      body: {'sessionId': sessionId, 'coverage': 'CREDIT'},
      parse: (json) {
        if (json is! Map) {
          throw ApiException('Respuesta inválida al anotar');
        }
        return StaffReservation.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }

  /// Cancela una reserva confirmada.
  Future<StaffReservation> cancel(String reservationId) {
    return _api.patchJson<StaffReservation>(
      '/api/reservations/$reservationId/status',
      body: {'status': 'CANCELLED'},
      parse: (json) {
        if (json is! Map) {
          throw ApiException('Respuesta inválida al cancelar');
        }
        return StaffReservation.fromJson(Map<String, dynamic>.from(json));
      },
    );
  }

  /// Busca afiliados ACTIVE (`q` + página). `q` vacío = primeras filas (como la web).
  Future<StaffMemberSearchPage> searchMembers({
    String query = '',
    int page = 1,
  }) {
    final q = query.trim();
    final params = <String, String>{
      'status': 'ACTIVE',
      'page': '$page',
      'pageSize': '20',
      'order': 'asc',
      'orderBy': 'name',
    };
    if (q.isNotEmpty) {
      params['q'] = q;
    }
    return _api.getJson<StaffMemberSearchPage>(
      '/api/members?${_qs(params)}',
      parse: (json) {
        final map = json is Map ? json : <String, dynamic>{};
        final items = _items(map).map(StaffMemberHit.fromJson).toList();
        return StaffMemberSearchPage(
          items: items,
          page: (map['page'] as num?)?.toInt() ?? page,
          total: (map['total'] as num?)?.toInt() ?? items.length,
          hasMore: map['hasMore'] as bool? ?? false,
        );
      },
    );
  }
}
