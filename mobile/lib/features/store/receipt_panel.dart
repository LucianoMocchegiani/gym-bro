import 'package:flutter/material.dart';

import '../../core/widgets/shared_widgets.dart';
import 'receipts_repository.dart';

String _pad2(int n) => n.toString().padLeft(2, '0');

String _formatDay(DateTime dt) {
  final local = dt.toLocal();
  return '${_pad2(local.day)}/${_pad2(local.month)}/${local.year}';
}

String _formatTime(DateTime dt) {
  final local = dt.toLocal();
  return '${_pad2(local.hour)}:${_pad2(local.minute)}';
}

const _weekdays = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

String _formatSessionRange(DateTime startsAt, DateTime endsAt) {
  final start = startsAt.toLocal();
  final end = endsAt.toLocal();
  final day = '${_weekdays[start.weekday - 1]} ${_pad2(start.day)}/${_pad2(start.month)}';
  return '$day ${_formatTime(start)}–${_formatTime(end)}';
}

/// Segunda línea de una línea de comprobante (mismo criterio que Admin).
String formatPaymentLineMeta(PaymentLine line) {
  if (line.kind == 'DROP_IN') {
    final parts = <String>[
      line.outcome == 'RESERVATION' ? 'Reserva confirmada' : 'Drop-in',
      if (line.branchName != null && line.branchName!.isNotEmpty) line.branchName!,
      if (line.sessionStartsAt != null && line.sessionEndsAt != null)
        _formatSessionRange(line.sessionStartsAt!, line.sessionEndsAt!),
    ];
    return parts.join(' · ');
  }
  String? vigencia;
  if (line.contractStartsAt != null) {
    vigencia = line.contractEndsAt != null
        ? 'vigencia ${_formatDay(line.contractStartsAt!)} – ${_formatDay(line.contractEndsAt!)}'
        : 'desde ${_formatDay(line.contractStartsAt!)} (sin vencimiento)';
  }
  final parts = <String>[
    line.outcome == 'CONTRACT' ? 'Contrato' : 'Pack',
    ?vigencia,
  ];
  return parts.join(' · ');
}

/// Servicio de un pack en el comprobante.
String formatPaymentLineService(PaymentLineService s) {
  if (s.credits == null) return '${s.name} · acceso libre';
  final unit = s.credits == 1 ? 'crédito' : 'créditos';
  return '${s.name} · ${s.credits} $unit';
}

String _methodLabel(String method) {
  return switch (method) {
    'CASH' => 'Efectivo',
    'MP' => 'Mercado Pago',
    'STUB' => 'Stub',
    _ => method,
  };
}

/// Panel de comprobante (RN-PAG-009), mismo contenido que Admin.
Future<void> showMemberReceiptPanel({
  required BuildContext context,
  required MemberReceipt receipt,
  required Set<String> pendingRefundItemIds,
  required Future<void> Function(PaymentLine line) onRequestRefund,
  required bool refundBusy,
}) {
  return showDialog<void>(
    context: context,
    builder: (context) {
      return AlertDialog(
        title: const Text('Comprobante'),
        content: SizedBox(
          width: double.maxFinite,
          child: SingleChildScrollView(
            child: _ReceiptBody(
              receipt: receipt,
              pendingRefundItemIds: pendingRefundItemIds,
              onRequestRefund: onRequestRefund,
              refundBusy: refundBusy,
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
        ],
      );
    },
  );
}

class _ReceiptBody extends StatelessWidget {
  const _ReceiptBody({
    required this.receipt,
    required this.pendingRefundItemIds,
    required this.onRequestRefund,
    required this.refundBusy,
  });

  final MemberReceipt receipt;
  final Set<String> pendingRefundItemIds;
  final Future<void> Function(PaymentLine line) onRequestRefund;
  final bool refundBusy;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final lines = receipt.lines;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          receipt.code,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 12),
        GymBroInfoLine(
          icon: Icons.payments_outlined,
          text: '\$${receipt.amount}',
        ),
        GymBroInfoLine(
          icon: Icons.payment_outlined,
          text: _methodLabel(receipt.method),
        ),
        GymBroInfoLine(
          icon: Icons.schedule,
          text: formatDateTimeShort(receipt.createdAt),
        ),
        if (lines.isNotEmpty) ...[
          const SizedBox(height: 8),
          for (final line in lines)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _ReceiptLine(
                line: line,
                showRefund: receipt.isCharge &&
                    line.status == 'APPROVED' &&
                    !pendingRefundItemIds.contains(line.id),
                pending: pendingRefundItemIds.contains(line.id),
                refundBusy: refundBusy,
                onRequestRefund: () => onRequestRefund(line),
              ),
            ),
        ] else if (receipt.description != null &&
            receipt.description!.isNotEmpty)
          Text(
            receipt.description!,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: scheme.onSurface.withValues(alpha: 0.7),
                ),
          ),
      ],
    );
  }
}

class _ReceiptLine extends StatelessWidget {
  const _ReceiptLine({
    required this.line,
    required this.showRefund,
    required this.pending,
    required this.refundBusy,
    required this.onRequestRefund,
  });

  final PaymentLine line;
  final bool showRefund;
  final bool pending;
  final bool refundBusy;
  final VoidCallback onRequestRefund;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final meta = formatPaymentLineMeta(line);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                line.title,
                style: Theme.of(context).textTheme.titleSmall,
              ),
            ),
            Text(
              '\$${line.amount}',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
        ),
        if (meta.isNotEmpty)
          Text(
            meta,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: scheme.onSurface.withValues(alpha: 0.65),
                ),
          ),
        for (final s in line.services)
          Text(
            formatPaymentLineService(s),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: scheme.onSurface.withValues(alpha: 0.65),
                ),
          ),
        if (pending)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              'Solicitud de devolución pendiente',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.secondary,
                  ),
            ),
          ),
        if (showRefund) ...[
          const SizedBox(height: 6),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: refundBusy ? null : onRequestRefund,
              child: const Text('Solicitar devolución'),
            ),
          ),
        ],
      ],
    );
  }
}
