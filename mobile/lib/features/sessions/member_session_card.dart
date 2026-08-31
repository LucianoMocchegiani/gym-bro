import 'package:flutter/material.dart';

import '../../core/widgets/shared_widgets.dart';
import '../store/catalog_card.dart';
import 'sessions_repository.dart';

/// Cómo se usa [MemberSessionCard]: reservar/comprar o gestionar lo propio.
enum MemberSessionCardMode {
  /// Calendario / día: reservar, carrito o waitlist.
  book,

  /// Mis clases: cancelar reserva o salir de espera.
  mine,
}

/// [CatalogCard] de una sesión, con CTAs de crédito / drop-in / waitlist.
class MemberSessionCard extends StatelessWidget {
  /// Crea la card.
  ///
  /// [session] aporta foto y sede. Precio/badges solo en el día y si no
  /// hay créditos (en Tienda van por [CatalogCard] directo).
  const MemberSessionCard({
    super.key,
    required this.mode,
    this.session,
    this.reservation,
    this.waitlist,
    this.hasCredits = false,
    this.mpConnected = false,
    this.busy = false,
    this.onReserve,
    this.onAddToCart,
    this.onJoinWaitlist,
    this.onLeaveWaitlist,
    this.onCancelReservation,
  });

  final MemberSession? session;
  final MemberSessionCardMode mode;
  final MemberReservation? reservation;
  final WaitlistEntry? waitlist;
  final bool hasCredits;
  final bool mpConnected;
  final bool busy;
  final VoidCallback? onReserve;
  final VoidCallback? onAddToCart;
  final VoidCallback? onJoinWaitlist;
  final VoidCallback? onLeaveWaitlist;
  final VoidCallback? onCancelReservation;

  @override
  Widget build(BuildContext context) {
    final owned = reservation != null;
    final waiting = waitlist != null;
    final mine = mode == MemberSessionCardMode.mine;
    final s = session;
    final title = s?.serviceName ??
        reservation?.serviceName ??
        waitlist?.serviceName ??
        'Sesión';
    final startsAt =
        s?.startsAt ?? reservation?.sessionStartsAt ?? waitlist!.sessionStartsAt;
    final dropIn = (s?.dropInPrice != null && s!.dropInPrice! > 0)
        ? s.dropInPrice
        : null;

    // Precio y badges: Tienda siempre; día solo sin créditos; Mis clases nunca.
    final showCommerce = !mine && !hasCredits && !owned;

    final badges = <String>[
      if (showCommerce) ...[
        if (waiting) 'En espera',
        if (!waiting && s != null && !s.hasSlots) 'Llena',
        if (dropIn != null) ...['Drop-in', 'Única sesión'],
      ],
    ];

    final bits = <String>[
      formatDateTimeShort(startsAt),
      if (s?.branchName != null) s!.branchName!,
    ];
    final details = <String>[
      if (s?.instructorName != null) 'Con ${s!.instructorName}',
      if (!mine && !owned && s != null && s.hasSlots)
        '${s.slotsLeft} cupo${s.slotsLeft == 1 ? '' : 's'}',
      if (waiting && waitlist?.position != null)
        'Puesto ${waitlist!.position} en la fila',
    ];

    final String label;
    final VoidCallback? onAction;
    if (mine) {
      if (owned) {
        label = 'Cancelar reserva';
        onAction = onCancelReservation;
      } else {
        label = 'Salir de la lista';
        onAction = onLeaveWaitlist;
      }
    } else if (owned) {
      label = 'Reservada';
      onAction = null;
    } else if (waiting) {
      label = 'Salir de la lista';
      onAction = onLeaveWaitlist;
    } else if (s != null && !s.hasSlots) {
      label = 'Unirme a la lista';
      onAction = onJoinWaitlist;
    } else if (hasCredits) {
      label = 'Reservar';
      onAction = onReserve;
    } else if (dropIn != null) {
      label = 'Al carrito';
      onAction = mpConnected ? onAddToCart : null;
    } else {
      label = 'Sin créditos';
      onAction = null;
    }

    return CatalogCard(
      item: CatalogItem(
        id: s?.id ?? reservation?.sessionId ?? waitlist?.sessionId ?? title,
        kind: CatalogKind.session,
        title: title,
        subtitle: bits.join(' · '),
        imageUrl: s?.serviceImageUrl,
        badges: badges,
        price: showCommerce ? dropIn : null,
        details: details,
        owned: false,
        enabled: onAction != null,
      ),
      actionLabel: label,
      onAction: busy ? null : onAction,
      actionBusy: busy,
    );
  }
}
