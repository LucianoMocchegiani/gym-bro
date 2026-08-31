import '../../core/network/api_client.dart';

/// Estado de cuenta del afiliado (CU-AFI-005).
class MemberAccount {
  /// Crea el modelo.
  MemberAccount({
    required this.debtStatus,
    required this.debtAmount,
    required this.contracts,
    required this.reservations,
  });

  final String debtStatus;
  final num debtAmount;
  final List<AccountContract> contracts;
  final List<AccountReservation> reservations;

  /// Contratos vigentes hoy (la API con `coverage=current` ya filtra en DB).
  List<AccountContract> get activeContracts => contracts;

  factory MemberAccount.fromJson(Map<String, dynamic> json) {
    final debt = json['debt'] as Map<String, dynamic>? ?? {};
    final contracts = (json['contracts'] as List<dynamic>? ?? [])
        .whereType<Map>()
        .map((e) => AccountContract.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    final reservations = (json['reservations'] as List<dynamic>? ?? [])
        .whereType<Map>()
        .map((e) => AccountReservation.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    return MemberAccount(
      debtStatus: debt['status'] as String? ?? 'AL_DIA',
      debtAmount: debt['amount'] as num? ?? 0,
      contracts: contracts,
      reservations: reservations,
    );
  }
}

/// Saldo de créditos por servicio dentro de un pack.
class AccountCreditBalance {
  AccountCreditBalance({
    required this.serviceId,
    required this.serviceName,
    required this.remaining,
    required this.initialAmount,
  });

  /// Servicio del saldo (`GET /me/account` → `creditBalances.serviceId`).
  final String serviceId;
  final String serviceName;
  final int remaining;
  final int initialAmount;

  factory AccountCreditBalance.fromJson(Map<String, dynamic> json) {
    return AccountCreditBalance(
      serviceId: json['serviceId'] as String? ?? '',
      serviceName: json['serviceName'] as String? ?? 'Servicio',
      remaining: json['remaining'] as int? ?? 0,
      initialAmount: json['initialAmount'] as int? ?? 0,
    );
  }
}

/// Contratación / pack en estado de cuenta.
class AccountContract {
  AccountContract({
    required this.packName,
    required this.status,
    required this.hasAccessLibre,
    required this.creditBalances,
    this.endsAt,
  });

  final String packName;
  final String status;
  final bool hasAccessLibre;
  final List<AccountCreditBalance> creditBalances;
  final DateTime? endsAt;

  factory AccountContract.fromJson(Map<String, dynamic> json) {
    final balances = (json['creditBalances'] as List<dynamic>? ?? [])
        .whereType<Map>()
        .map(
          (e) => AccountCreditBalance.fromJson(Map<String, dynamic>.from(e)),
        )
        .toList();
    return AccountContract(
      packName: json['packName'] as String? ?? 'Pack',
      status: json['status'] as String? ?? '',
      hasAccessLibre: json['hasAccessLibre'] as bool? ?? false,
      creditBalances: balances,
      endsAt: json['endsAt'] != null
          ? DateTime.tryParse(json['endsAt'] as String)
          : null,
    );
  }
}

/// Próxima reserva.
class AccountReservation {
  AccountReservation({
    required this.serviceName,
    required this.startsAt,
    required this.status,
  });

  final String serviceName;
  final DateTime startsAt;
  final String status;

  factory AccountReservation.fromJson(Map<String, dynamic> json) {
    return AccountReservation(
      serviceName: json['serviceName'] as String? ?? 'Sesión',
      startsAt: DateTime.parse(json['startsAt'] as String),
      status: json['status'] as String? ?? '',
    );
  }
}

/// Acceso a `GET /me/account`.
class AccountRepository {
  AccountRepository(this._api);

  final ApiClient _api;

  /// Trae estado de cuenta del afiliado (packs vigentes hoy).
  ///
  /// `coverage=current` filtra en API/DB; no trae historial de otros períodos.
  Future<MemberAccount> fetchMine() {
    return _api.getJson(
      '/api/me/account?coverage=current',
      parse: (json) => MemberAccount.fromJson(json! as Map<String, dynamic>),
    );
  }
}
