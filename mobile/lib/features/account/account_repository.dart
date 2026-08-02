import '../../core/network/api_client.dart';

/// Estado de cuenta del afiliado (CU-AFI-005).
class MemberAccount {
  /// Crea el modelo.
  MemberAccount({
    required this.memberName,
    required this.memberEmail,
    required this.activeContracts,
    required this.hasAccessLibre,
    required this.totalCreditsRemaining,
    required this.debtStatus,
    required this.debtAmount,
    required this.contracts,
    required this.reservations,
  });

  final String? memberName;
  final String memberEmail;
  final int activeContracts;
  final bool hasAccessLibre;
  final int totalCreditsRemaining;
  final String debtStatus;
  final num debtAmount;
  final List<AccountContract> contracts;
  final List<AccountReservation> reservations;

  factory MemberAccount.fromJson(Map<String, dynamic> json) {
    final member = json['member'] as Map<String, dynamic>;
    final summary = json['summary'] as Map<String, dynamic>;
    final debt = json['debt'] as Map<String, dynamic>;
    final contracts = (json['contracts'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(AccountContract.fromJson)
        .toList();
    final reservations = (json['reservations'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(AccountReservation.fromJson)
        .toList();
    return MemberAccount(
      memberName: member['name'] as String?,
      memberEmail: member['email'] as String,
      activeContracts: summary['activeContracts'] as int? ?? 0,
      hasAccessLibre: summary['hasAccessLibre'] as bool? ?? false,
      totalCreditsRemaining: summary['totalCreditsRemaining'] as int? ?? 0,
      debtStatus: debt['status'] as String? ?? 'AL_DIA',
      debtAmount: debt['amount'] as num? ?? 0,
      contracts: contracts,
      reservations: reservations,
    );
  }
}

/// Contrato en estado de cuenta.
class AccountContract {
  AccountContract({required this.packName, required this.status, this.endsAt});

  final String packName;
  final String status;
  final DateTime? endsAt;

  factory AccountContract.fromJson(Map<String, dynamic> json) {
    return AccountContract(
      packName: json['packName'] as String? ?? 'Pack',
      status: json['status'] as String? ?? '',
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

  /// Trae estado de cuenta del afiliado autenticado.
  Future<MemberAccount> fetchMine() {
    return _api.getJson(
      '/api/me/account',
      parse: (json) => MemberAccount.fromJson(json! as Map<String, dynamic>),
    );
  }
}
