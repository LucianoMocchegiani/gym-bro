import '../../core/network/api_client.dart';

/// Aviso in-app (N1).
class AppNotification {
  /// Crea el modelo.
  AppNotification({
    required this.id,
    required this.eventCode,
    required this.title,
    required this.body,
    required this.inAppRead,
    required this.createdAt,
  });

  final String id;
  final String eventCode;
  final String title;
  final String body;
  final bool inAppRead;
  final DateTime createdAt;

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String,
      eventCode: json['eventCode'] as String,
      title: json['title'] as String,
      body: json['body'] as String,
      inAppRead: json['inAppRead'] as bool? ?? false,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

/// Opt-out de email por evento.
class NotificationEmailPref {
  /// Crea el modelo.
  NotificationEmailPref({
    required this.eventCode,
    required this.emailEnabled,
  });

  final String eventCode;
  final bool emailEnabled;

  factory NotificationEmailPref.fromJson(Map<String, dynamic> json) {
    return NotificationEmailPref(
      eventCode: json['eventCode'] as String,
      emailEnabled: json['emailEnabled'] as bool? ?? true,
    );
  }

  /// Texto para el switch.
  String get label {
    switch (eventCode) {
      case 'PAYMENT_APPROVED':
        return 'Pago acreditado';
      case 'RESERVATION_CONFIRMED':
        return 'Reserva confirmada';
      case 'RESERVATION_CANCELLED':
        return 'Reserva cancelada';
      case 'WAITLIST_PROMOTED':
        return 'Lugar en lista de espera';
      case 'REFUND_EXECUTED':
        return 'Devolución';
      case 'CONTRACT_EXPIRING':
        return 'Pack por vencer (caja)';
      case 'CONTRACT_EXPIRING_DEBIT':
        return 'Pack por vencer (débito)';
      case 'CONTRACT_IN_TOLERANCE':
        return 'Pack vencido (tolerancia)';
      case 'DEBIT_CHARGE_FAILED':
        return 'Débito: cobro no acreditado';
      case 'DEBIT_MANDATE_FAILED':
        return 'Débito: mandato fallido';
      default:
        return eventCode;
    }
  }
}

/// Bandeja y opt-out N1 (`GET /me/notifications`).
class NotificationsRepository {
  /// Crea el repositorio.
  NotificationsRepository(this._api);

  final ApiClient _api;

  Future<List<AppNotification>> listMine() {
    return _api.getJson<List<AppNotification>>(
      '/api/me/notifications',
      parse: (json) {
        if (json is! List) {
          return [];
        }
        return json
            .whereType<Map>()
            .map((e) => AppNotification.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      },
    );
  }

  Future<void> markRead(String id) async {
    await _api.patchJson<void>(
      '/api/me/notifications/$id/read',
      parse: (_) {},
    );
  }

  Future<List<NotificationEmailPref>> listEmailPrefs() {
    return _api.getJson<List<NotificationEmailPref>>(
      '/api/me/notification-preferences',
      parse: (json) {
        if (json is! List) {
          return [];
        }
        return json
            .whereType<Map>()
            .map(
              (e) =>
                  NotificationEmailPref.fromJson(Map<String, dynamic>.from(e)),
            )
            .toList();
      },
    );
  }

  Future<NotificationEmailPref> setEmailPref(
    String eventCode,
    bool emailEnabled,
  ) {
    return _api.patchJson<NotificationEmailPref>(
      '/api/me/notification-preferences',
      body: {'eventCode': eventCode, 'emailEnabled': emailEnabled},
      parse: (json) => NotificationEmailPref.fromJson(
        Map<String, dynamic>.from(json as Map),
      ),
    );
  }
}
