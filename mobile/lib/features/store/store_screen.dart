import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/network/api_client.dart';
import '../../core/widgets/gym_bro_tabs.dart';
import '../../core/widgets/shared_widgets.dart';
import '../account/account_repository.dart';
import 'refund_repository.dart';
import 'store_repository.dart';

/// Tienda de packs + historial de pagos + solicitud de devolución (E9).
class StoreScreen extends StatefulWidget {
  /// Crea la pantalla.
  const StoreScreen({super.key});

  @override
  State<StoreScreen> createState() => _StoreScreenState();
}

enum _StoreTab { packs, payments }

class _StoreScreenState extends State<StoreScreen> {
  _StoreTab _tab = _StoreTab.packs;
  List<MemberPack>? _packs;
  List<AccountRecentPayment>? _payments;
  bool _mpConnected = false;
  String? _error;
  bool _busy = false;
  String? _busyId;

  StoreRepository get _store => context.read<StoreRepository>();
  RefundRepository get _refund => context.read<RefundRepository>();
  AccountRepository get _account => context.read<AccountRepository>();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_packs == null && _error == null) _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final results = await Future.wait([
        _store.listPacks(),
        _account.fetchMine(),
        _store.getMpConnected(),
      ]);
      if (!mounted) return;
      setState(() {
        _packs = results[0] as List<MemberPack>;
        _payments = (results[1] as MemberAccount).recentPayments;
        _mpConnected = results[2] as bool;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e is ApiException ? e.message : 'No se pudo cargar la tienda';
      });
    }
  }

  Future<void> _buy(MemberPack pack) async {
    setState(() {
      _busy = true;
      _busyId = pack.id;
    });
    try {
      final checkout = await _store.startPackCheckout(pack.id);
      if (!mounted) return;
      final url = checkout.checkoutUrl;
      if (url == null || url.isEmpty) {
        _snack('El pago no está disponible en este momento');
        return;
      }
      await _showCheckoutDialog(url, pack.name);
    } on ApiException catch (e) {
      if (!mounted) return;
      _snack(e.message);
    } catch (_) {
      if (!mounted) return;
      _snack('Algo salió mal, intentá de nuevo');
    } finally {
      if (mounted) setState(() { _busy = false; _busyId = null; });
    }
  }

  Future<void> _showCheckoutDialog(String url, String packName) async {
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Comprar $packName'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Se abrirá Mercado Pago para completar el pago.',
              style: TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 12),
            SelectableText(
              url,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: url));
              if (context.mounted) {
                Navigator.pop(context);
                _snack('Link copiado');
              }
            },
            child: const Text('Copiar link'),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(context);
              final uri = Uri.parse(url);
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              } else {
                _snack('No se pudo abrir el navegador');
              }
            },
            child: const Text('Pagar'),
          ),
        ],
      ),
    );
  }

  Future<void> _requestRefund(AccountRecentPayment payment) async {
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
    if (ok != true || !mounted) return;

    setState(() { _busy = true; _busyId = payment.id; });
    try {
      await _refund.requestRefund(
        payment.id,
        reason: reasonController.text.trim(),
      );
      if (!mounted) return;
      _snack('Solicitud de devolución enviada');
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      _snack(e.message);
    } catch (_) {
      if (!mounted) return;
      _snack('No se pudo enviar la solicitud');
    } finally {
      if (mounted) setState(() { _busy = false; _busyId = null; });
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
      appBar: AppBar(title: const Text('Tienda')),
      body: Column(
        children: [
          GymBroTabs(
            tabs: const [
              GymBroTab(label: 'Packs', icon: Icons.inventory_2_outlined),
              GymBroTab(label: 'Pagos', icon: Icons.receipt_long_outlined),
            ],
            selectedIndex: _tab.index,
            onChanged: (i) => setState(() => _tab = _StoreTab.values[i]),
          ),
          if (!_mpConnected)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(20, 0, 20, 4),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: Theme.of(context).colorScheme.errorContainer,
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.warning_amber_outlined,
                    size: 18,
                    color: Theme.of(context).colorScheme.onErrorContainer,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'El pago online no está disponible. Consultá en el gym.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context)
                                .colorScheme
                                .onErrorContainer,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          Expanded(child: _buildBody()),
        ],
      ),
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
    final packs = _packs;
    if (packs == null) {
      return const Center(child: CircularProgressIndicator());
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: switch (_tab) {
        _StoreTab.packs => _buildPacks(packs),
        _StoreTab.payments => _buildPayments(),
      },
    );
  }

  Widget _buildPacks(List<MemberPack> packs) {
    if (packs.isEmpty) {
      return ListView(
        children: [
          const GymBroMessagePane(
            icon: Icons.storefront_outlined,
            message: 'No hay packs disponibles por ahora.',
          ),
        ],
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
      itemCount: packs.length,
      itemBuilder: (context, i) {
        final pack = packs[i];
        return Padding(
          padding: EdgeInsets.only(top: i == 0 ? 0 : 12),
          child: _PackCard(
            pack: pack,
            busy: _busy && _busyId == pack.id,
            mpConnected: _mpConnected,
            onBuy: () => _buy(pack),
          ),
        );
      },
    );
  }

  Widget _buildPayments() {
    final payments = _payments ?? const <AccountRecentPayment>[];
    if (payments.isEmpty) {
      return ListView(
        children: [
          const GymBroMessagePane(
            icon: Icons.receipt_long,
            message: 'Todavía no tenés pagos registrados.',
          ),
        ],
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
      itemCount: payments.length,
      itemBuilder: (context, i) {
        final p = payments[i];
        return Padding(
          padding: EdgeInsets.only(top: i == 0 ? 0 : 12),
          child: _PaymentCard(
            payment: p,
            busy: _busy && _busyId == p.id,
            onRefund: p.canRefund ? () => _requestRefund(p) : null,
          ),
        );
      },
    );
  }
}

class _PackCard extends StatelessWidget {
  const _PackCard({
    required this.pack,
    required this.busy,
    required this.mpConnected,
    required this.onBuy,
  });

  final MemberPack pack;
  final bool busy;
  final bool mpConnected;
  final VoidCallback onBuy;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
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
                  pack.name,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              GymBroBadge(label: pack.kind, color: scheme.secondary),
            ],
          ),
          if (pack.description != null && pack.description!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              pack.description!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: scheme.onSurface.withValues(alpha: 0.7),
                  ),
            ),
          ],
          const SizedBox(height: 12),
          Text(
            '\$${pack.price} · ${pack.billingLabel}',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: scheme.primary,
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 12),
          ...pack.components.map(
            (c) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  Icon(
                    c.serviceType == 'ACCESO_LIBRE'
                        ? Icons.fitness_center_outlined
                        : Icons.event_available_outlined,
                    size: 16,
                    color: scheme.onSurface.withValues(alpha: 0.6),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      c.serviceName,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                  if (c.creditAmount != null)
                    Text(
                      '${c.creditAmount} créditos',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: scheme.primary,
                          ),
                    ),
                  if (c.serviceType == 'ACCESO_LIBRE')
                    Text(
                      'Acceso libre',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: scheme.primary,
                          ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: (busy || !mpConnected) ? null : onBuy,
              child: busy
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Comprar'),
            ),
          ),
        ],
      ),
    );
  }
}

class _PaymentCard extends StatelessWidget {
  const _PaymentCard({
    required this.payment,
    required this.busy,
    required this.onRefund,
  });

  final AccountRecentPayment payment;
  final bool busy;
  final VoidCallback? onRefund;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final statusColor = switch (payment.status) {
      'APPROVED' => scheme.primary,
      'REFUNDED' => scheme.error,
      'REJECTED' => scheme.error,
      _ => scheme.onSurface.withValues(alpha: 0.6),
    };
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
                  '\$${payment.amount}',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              GymBroBadge(label: payment.status, color: statusColor),
            ],
          ),
          const SizedBox(height: 8),
          GymBroInfoLine(expanded: false,icon: Icons.schedule, text: formatDateTimeShort(payment.createdAt)),
          GymBroInfoLine(expanded: false,
            icon: Icons.payment_outlined,
            text: payment.method,
          ),
          if (onRefund != null) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.tonal(
                onPressed: busy ? null : onRefund,
                child: busy
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Solicitar devolución'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

