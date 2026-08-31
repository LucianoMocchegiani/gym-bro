import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import '../../core/widgets/shared_widgets.dart';
import 'receipt_panel.dart';
import 'receipts_repository.dart';
import 'refund_repository.dart';

/// Historial del afiliado: un comprobante por transacción (cart), como en Admin.
class HistoryScreen extends StatefulWidget {
  /// Crea la pantalla.
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<MemberReceipt>? _receipts;
  Set<String> _pendingRefundItemIds = {};
  String? _error;
  bool _busy = false;
  String? _busyId;

  ReceiptsRepository get _receiptsRepo => context.read<ReceiptsRepository>();
  RefundRepository get _refund => context.read<RefundRepository>();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_receipts == null && _error == null) _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final results = await Future.wait([
        _receiptsRepo.listMine(),
        _refund.listMine(),
      ]);
      if (!mounted) return;
      final requests = results[1] as List<RefundRequest>;
      setState(() {
        _receipts = results[0] as List<MemberReceipt>;
        _pendingRefundItemIds = requests
            .where((r) => r.status == 'PENDING')
            .map((r) => r.transactionItemId)
            .toSet();
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e is ApiException ? e.message : 'No se pudo cargar el historial';
      });
    }
  }

  Future<void> _openReceipt(MemberReceipt row) async {
    setState(() {
      _busy = true;
      _busyId = row.id;
    });
    try {
      final detail = await _receiptsRepo.getMine(row.id);
      if (!mounted) return;
      await showMemberReceiptPanel(
        context: context,
        receipt: detail,
        pendingRefundItemIds: _pendingRefundItemIds,
        refundBusy: false,
        onRequestRefund: (line) async {
          Navigator.of(context).pop();
          await _askRefund(line);
        },
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      _snack(e.message);
    } catch (_) {
      if (!mounted) return;
      _snack('No se pudo abrir el comprobante');
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _busyId = null;
        });
      }
    }
  }

  Future<void> _askRefund(PaymentLine line) async {
    final reasonController = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Solicitar devolución'),
        content: TextField(
          controller: reasonController,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'Motivo (opcional)',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Enviar'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) {
      reasonController.dispose();
      return;
    }
    final reason = reasonController.text.trim();
    reasonController.dispose();

    try {
      await _refund.requestRefund(line.id, reason: reason);
      if (!mounted) return;
      _snack('Solicitud de devolución enviada');
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      _snack(e.message);
    } catch (_) {
      if (!mounted) return;
      _snack('No se pudo enviar la solicitud');
    }
  }

  void _snack(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Historial')),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_error != null) {
      return GymBroMessagePane(
        icon: Icons.error_outline,
        message: _error!,
        actionLabel: 'Reintentar',
        onAction: _load,
      );
    }
    final receipts = _receipts;
    if (receipts == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (receipts.isEmpty) {
      return const GymBroMessagePane(
        icon: Icons.receipt_long,
        message: 'Todavía no tenés comprobantes.',
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
        itemCount: receipts.length,
        itemBuilder: (context, i) {
          final r = receipts[i];
          return Padding(
            padding: EdgeInsets.only(top: i == 0 ? 0 : 12),
            child: _ReceiptRow(
              receipt: r,
              busy: _busy && _busyId == r.id,
              onOpen: () => _openReceipt(r),
            ),
          );
        },
      ),
    );
  }
}

class _ReceiptRow extends StatelessWidget {
  const _ReceiptRow({
    required this.receipt,
    required this.busy,
    required this.onOpen,
  });

  final MemberReceipt receipt;
  final bool busy;
  final VoidCallback onOpen;

  String get _summary {
    final lines = receipt.lines;
    if (lines.isEmpty) {
      return receipt.description?.trim().isNotEmpty == true
          ? receipt.description!
          : receipt.code;
    }
    if (lines.length == 1) return lines.first.title;
    return '${lines.length} ítems';
  }

  String get _methodLabel => switch (receipt.method) {
        'CASH' => 'Efectivo',
        'MP' => 'Mercado Pago',
        'STUB' => 'Stub',
        _ => receipt.method,
      };

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isRefund = !receipt.isCharge;
    final badgeColor = isRefund ? scheme.error : scheme.primary;
    final badgeLabel = isRefund ? 'Devolución' : 'Pago';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scheme.outline.withValues(alpha: 0.5)),
        color: scheme.surface,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  receipt.code,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
              GymBroBadge(label: badgeLabel, color: badgeColor),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            _summary,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 8),
          GymBroInfoLine(
            expanded: false,
            icon: Icons.payments_outlined,
            text: '\$${receipt.amount}',
          ),
          GymBroInfoLine(
            expanded: false,
            icon: Icons.payment_outlined,
            text: _methodLabel,
          ),
          GymBroInfoLine(
            expanded: false,
            icon: Icons.schedule,
            text: formatDateTimeShort(receipt.createdAt),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton.tonal(
              onPressed: busy ? null : onOpen,
              child: busy
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Ver comprobante'),
            ),
          ),
        ],
      ),
    );
  }
}

/// Menú ⋮ del AppBar: Historial (Tienda, Sesiones y detalle del día).
class HistoryAppBarButton extends StatelessWidget {
  /// Crea el botón.
  const HistoryAppBarButton({super.key});

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      tooltip: 'Más',
      onSelected: (value) {
        if (value == 'history') {
          Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const HistoryScreen()),
          );
        }
      },
      itemBuilder: (context) => const [
        PopupMenuItem(
          value: 'history',
          child: Text('Historial'),
        ),
      ],
    );
  }
}
