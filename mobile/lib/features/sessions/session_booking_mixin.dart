import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import '../../core/widgets/confirm_dialog.dart';
import '../../core/widgets/shared_widgets.dart';
import '../account/account_repository.dart';
import '../cart/cart_screen.dart';
import '../cart/member_cart_controller.dart';
import '../store/store_repository.dart';
import 'sessions_repository.dart';

/// Reserva, carrito drop-in y waitlist compartidos entre calendario y día.
mixin SessionBookingMixin<T extends StatefulWidget> on State<T> {
  SessionsRepository get _bookingSessions =>
      context.read<SessionsRepository>();
  AccountRepository get _bookingAccount => context.read<AccountRepository>();
  StoreRepository get _bookingStore => context.read<StoreRepository>();

  List<MemberReservation> bookingReservations = [];
  List<WaitlistEntry> bookingWaitlist = [];
  Map<String, int> bookingCredits = {};
  bool bookingMpConnected = false;
  bool bookingBusy = false;
  String? bookingBusySessionId;

  /// Carga reservas, espera, créditos y estado MP.
  Future<void> loadBookingSideData() async {
    final results = await Future.wait([
      _bookingSessions.listReservations(),
      _bookingSessions.listWaitlist(),
      _bookingAccount.fetchMine(),
      _bookingStore.getMpConnected(),
    ]);
    if (!mounted) return;
    final account = results[2] as MemberAccount;
    bookingReservations = results[0] as List<MemberReservation>;
    bookingWaitlist = results[1] as List<WaitlistEntry>;
    bookingCredits = _sumCredits(account);
    bookingMpConnected = results[3] as bool;
  }

  Map<String, int> _sumCredits(MemberAccount account) {
    final map = <String, int>{};
    for (final contract in account.contracts) {
      for (final b in contract.creditBalances) {
        if (b.serviceId.isEmpty) continue;
        map[b.serviceId] = (map[b.serviceId] ?? 0) + b.remaining;
      }
    }
    return map;
  }

  bool bookingHasCredits(String serviceId) =>
      (bookingCredits[serviceId] ?? 0) > 0;

  MemberReservation? bookingReservationFor(String sessionId) {
    for (final r in bookingReservations) {
      if (r.sessionId == sessionId && r.status == 'CONFIRMED') return r;
    }
    return null;
  }

  WaitlistEntry? bookingWaitlistFor(String sessionId) {
    for (final w in bookingWaitlist) {
      if (w.sessionId == sessionId && w.status == 'WAITING') return w;
    }
    return null;
  }

  void bookingSnack(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> bookingRun(
    String? sessionId,
    Future<void> Function() action, {
    Future<void> Function()? onDone,
  }) async {
    setState(() {
      bookingBusy = true;
      bookingBusySessionId = sessionId;
    });
    try {
      await action();
      if (!mounted) return;
      if (onDone != null) await onDone();
    } on ApiException catch (e) {
      if (!mounted) return;
      bookingSnack(e.message);
    } catch (_) {
      if (!mounted) return;
      bookingSnack('Algo salió mal, intentá de nuevo');
    } finally {
      if (mounted) {
        setState(() {
          bookingBusy = false;
          bookingBusySessionId = null;
        });
      }
    }
  }

  Future<void> bookingReserve(
    MemberSession session, {
    required Future<void> Function() onDone,
  }) {
    return bookingRun(session.id, () async {
      try {
        await _bookingSessions.reserve(session.id);
        if (mounted) bookingSnack('Reserva confirmada');
      } on ApiException catch (e) {
        if (e.message.toLowerCase().contains('credit') &&
            session.dropInPrice != null) {
          if (mounted) bookingAddToCart(session);
          return;
        }
        rethrow;
      }
    }, onDone: onDone);
  }

  void bookingAddToCart(MemberSession session) {
    if (bookingReservationFor(session.id) != null) {
      bookingSnack('Ya tenés esta sesión');
      return;
    }
    final price = session.dropInPrice;
    if (price == null || price < 1) {
      bookingSnack('Esta sesión no tiene drop-in. Comprá un pack en Tienda.');
      return;
    }
    if (!bookingMpConnected) {
      bookingSnack('El pago online no está disponible. Consultá en el gym.');
      return;
    }
    final cart = context.read<MemberCartController>();
    final added = cart.add(
      MemberCartLine(
        kind: MemberCartKind.dropIn,
        id: session.id,
        title: session.serviceName,
        subtitle: formatDateTimeShort(session.startsAt),
        amount: price,
      ),
    );
    if (!added) {
      bookingSnack('Este drop-in ya está en el carrito');
      return;
    }
    showAddedToCartSnack(context);
  }

  Future<void> bookingCancelReservation(
    MemberReservation r, {
    required Future<void> Function() onDone,
  }) async {
    final ok = await showConfirmDialog(
      context,
      title: 'Cancelar reserva',
      message: '¿Querés liberar este cupo?',
      confirmLabel: 'Cancelar reserva',
      cancelLabel: 'No',
    );
    if (!ok || !mounted) return;
    await bookingRun(null, () async {
      await _bookingSessions.cancelReservation(r.id);
      if (mounted) bookingSnack('Reserva cancelada');
    }, onDone: onDone);
  }

  Future<void> bookingJoinWaitlist(
    MemberSession session, {
    required Future<void> Function() onDone,
  }) {
    return bookingRun(session.id, () async {
      await _bookingSessions.joinWaitlist(session.id);
      if (mounted) bookingSnack('Estás en la lista de espera');
    }, onDone: onDone);
  }

  Future<void> bookingLeaveWaitlist(
    WaitlistEntry entry, {
    required Future<void> Function() onDone,
  }) async {
    final ok = await showConfirmDialog(
      context,
      title: 'Salir de la lista',
      message: '¿Querés liberar tu lugar en la espera?',
      confirmLabel: 'Salir',
      cancelLabel: 'No',
    );
    if (!ok || !mounted) return;
    await bookingRun(null, () async {
      await _bookingSessions.leaveWaitlist(entry.id);
      if (mounted) bookingSnack('Saliste de la lista de espera');
    }, onDone: onDone);
  }
}
