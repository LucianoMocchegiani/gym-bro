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

  /// Parsea JSON de la API.
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

/// Preferencia de email para pago acreditado.
class NotificationEmailPref {
  /// Crea el modelo.
  NotificationEmailPref({required this.emailEnabled});

  final bool emailEnabled;

  factory NotificationEmailPref.fromJson(Map<String, dynamic> json) {
    return NotificationEmailPref(
      emailEnabled: json['emailEnabled'] as bool? ?? true,
    );
  }
}

/// Bandeja y opt-out N1 (`GET /me/notifications`).
///
/// CU-NOT-003 / CU-NOT-005. Push queda post-MVP.
class NotificationsRepository {
  /// Crea el repositorio.
  NotificationsRepository(this._api);

  final ApiClient _api;

  /// Últimos avisos del socio.
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

  /// Marca leída.
  Future<void> markRead(String id) async {
    await _api.patchJson<void>(
      '/api/me/notifications/$id/read',
      parse: (_) {},
    );
  }

  /// Opt-out de email de pago acreditado.
  Future<NotificationEmailPref> getEmailPref() {
    return _api.getJson<NotificationEmailPref>(
      '/api/me/notification-preferences',
      parse: (json) => NotificationEmailPref.fromJson(
        Map<String, dynamic>.from(json as Map),
      ),
    );
  }

  /// Guarda opt-out de email.
  Future<NotificationEmailPref> setEmailPref(bool emailEnabled) {
    return _api.patchJson<NotificationEmailPref>(
      '/api/me/notification-preferences',
      body: {'emailEnabled': emailEnabled},
      parse: (json) => NotificationEmailPref.fromJson(
        Map<String, dynamic>.from(json as Map),
      ),
    );
  }
}
