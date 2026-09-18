import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/network/api_client.dart';
import '../../core/widgets/confirm_dialog.dart';
import '../../core/widgets/gym_bro_tabs.dart';
import '../../core/widgets/loading_dialog.dart';
import '../staff_sessions/staff_member_search_field.dart';
import '../staff_sessions/staff_sessions_repository.dart';
import 'staff_caja_repository.dart';

/// Caja: cobro (efectivo / link MP) y débitos (ver / baja).
class StaffCajaScreen extends StatefulWidget {
  /// Crea la pantalla.
  const StaffCajaScreen({super.key});

  @override
  State<StaffCajaScreen> createState() => _StaffCajaScreenState();
}

class _StaffCajaScreenState extends State<StaffCajaScreen> {
  int _vista = 0;
  int _catalogTab = 0;
  StaffMemberHit? _member;
  final _cart = <CajaCartItem>[];
  int _seq = 0;
  List<StaffPack> _packs = const [];
  List<StaffSession> _sessions = const [];
  Map<String, int> _prices = const {};
  String? _catalogError;
  bool _catalogLoading = true;
  String _medio = 'CASH';
  String? _mpUrl;
  String? _okMessage;
  Timer? _poll;
  List<DebitMandate> _queue = const [];
  MemberDebitView? _debitView;

  int get _total => _cart.fold(0, (s, i) => s + i.price);

  @override
  void initState() {
    super.initState();
    _loadCatalog();
    _loadDebits();
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _loadCatalog() async {
    setState(() {
      _catalogLoading = true;
      _catalogError = null;
    });
    try {
      final caja = context.read<StaffCajaRepository>();
      final sessions = context.read<StaffSessionsRepository>();
      final from = DateTime.now();
      final to = from.add(const Duration(days: 14));
      final packs = await caja.listActivePacks();
      final sess = await sessions.listPublished(from: from, to: to);
      final prices = await caja.dropInPrices();
      if (!mounted) {
        return;
      }
      setState(() {
        _packs = packs;
        _sessions = sess;
        _prices = prices;
        _catalogLoading = false;
      });
    } catch (e) {
      if (!mounted) {
        return;
      }
      setState(() {
        _catalogLoading = false;
        _catalogError = e is ApiException
            ? e.message
            : 'No se pudo cargar el catálogo';
      });
    }
  }

  Future<void> _loadDebits() async {
    try {
      final caja = context.read<StaffCajaRepository>();
      final queue = await caja.listMandates();
      MemberDebitView? view;
      final member = _member;
      if (member != null) {
        view = await caja.memberDebit(member.id);
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _queue = queue;
        _debitView = view;
      });
    } catch (_) {
      // La cola no bloquea el cobro.
    }
  }

  void _addPack(StaffPack pack) {
    setState(() {
      _cart.add(
        CajaCartItem(
          key: 'p-${pack.id}-${_seq++}',
          kind: 'PACK',
          refId: pack.id,
          label: pack.name,
          price: pack.price,
        ),
      );
    });
  }

  void _addDropIn(StaffSession session, int price) {
    final when = session.startsAt.toLocal();
    setState(() {
      _cart.add(
        CajaCartItem(
          key: 's-${session.id}-${_seq++}',
          kind: 'DROP_IN',
          refId: session.id,
          label:
              '${session.serviceName} ${_two(when.day)}/${_two(when.month)} ${_two(when.hour)}:${_two(when.minute)}',
          price: price,
        ),
      );
    });
  }

  String _two(int n) => n.toString().padLeft(2, '0');

  String _idem(String prefix) =>
      '$prefix-${DateTime.now().microsecondsSinceEpoch}';

  Future<void> _cobrarCash() async {
    final member = _member;
    if (member == null || _cart.isEmpty) {
      return;
    }
    final caja = context.read<StaffCajaRepository>();
    try {
      final result = await runWithLoadingDialog(
        context,
        message: 'Cobrando…',
        action: () => caja.startCashCart(
          memberId: member.id,
          items: List.of(_cart),
          idempotencyKey: _idem('cash'),
        ),
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _cart.clear();
        _mpUrl = null;
        _okMessage = result.receipt != null
            ? 'Cobrado ${result.receipt!.code}'
            : 'Cobrado en efectivo';
      });
    } catch (e) {
      if (!mounted) {
        return;
      }
      final msg = e is ApiException ? e.message : 'No se pudo cobrar';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  Future<void> _cobrarMp() async {
    final member = _member;
    if (member == null || _cart.isEmpty) {
      return;
    }
    final caja = context.read<StaffCajaRepository>();
    try {
      final result = await runWithLoadingDialog(
        context,
        message: 'Creando link…',
        action: () => caja.startMpCart(
          memberId: member.id,
          items: List.of(_cart),
          idempotencyKey: _idem('mp'),
        ),
      );
      if (!mounted) {
        return;
      }
      final url = result.checkoutUrl;
      setState(() {
        _mpUrl = url;
        _okMessage = 'Link MP listo. El comprobante aparece al pagar.';
      });
      _poll?.cancel();
      if (result.transactionId.isNotEmpty) {
        _poll = Timer.periodic(const Duration(seconds: 4), (_) async {
          try {
            final r = await caja.receiptByTransaction(result.transactionId);
            if (!mounted) {
              return;
            }
            _poll?.cancel();
            setState(() {
              _cart.clear();
              _okMessage = 'MP aprobado · ${r.code}';
            });
          } catch (_) {
            // PENDING
          }
        });
      }
    } catch (e) {
      if (!mounted) {
        return;
      }
      final msg = e is ApiException ? e.message : 'No se pudo crear el link';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  Future<void> _openUrl(String raw) async {
    final uri = Uri.tryParse(raw);
    if (uri == null) {
      return;
    }
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _cancelMandate(String id) async {
    final ok = await showConfirmDialog(
      context,
      title: 'Dar de baja débito',
      message: 'El contrato vigente sigue hasta su fecha. ¿Bajas el mandato?',
      confirmLabel: 'Dar de baja',
      isDestructive: true,
    );
    if (!ok || !mounted) {
      return;
    }
    try {
      await context.read<StaffCajaRepository>().cancelMandate(id);
      await _loadDebits();
    } catch (e) {
      if (!mounted) {
        return;
      }
      final msg = e is ApiException ? e.message : 'No se pudo dar de baja';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Caja')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          StaffMemberSearchField(
            selected: _member,
            onSelected: (m) {
              setState(() => _member = m);
              _loadDebits();
            },
          ),
          const SizedBox(height: 12),
          GymBroTabs(
            padding: EdgeInsets.zero,
            tabs: const [
              GymBroTab(label: 'Cobro'),
              GymBroTab(label: 'Débitos'),
            ],
            selectedIndex: _vista,
            onChanged: (i) => setState(() => _vista = i),
          ),
          const SizedBox(height: 8),
          if (_okMessage != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(_okMessage!),
            ),
          if (_vista == 0) ...[
            _tabPanel(_buildCatalogo()),
            const SizedBox(height: 12),
            _tabPanel(_buildCarrito()),
          ] else
            _tabPanel(_buildDebitos()),
        ],
      ),
    );
  }

  /// Recuadro suave del contenido de Cobro / Débitos.
  Widget _tabPanel(Widget child) {
    final scheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Color.alphaBlend(
          scheme.primary.withValues(alpha: 0.08),
          scheme.surfaceContainerHighest,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
        child: child,
      ),
    );
  }

  Widget _buildCatalogo() {
    final dropIns = _sessions
        .where((s) => (_prices[s.serviceId] ?? 0) > 0)
        .toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GymBroTabs(
          padding: EdgeInsets.zero,
          tabs: const [
            GymBroTab(label: 'Servicios'),
            GymBroTab(label: 'Packs'),
          ],
          selectedIndex: _catalogTab,
          onChanged: (i) => setState(() => _catalogTab = i),
        ),
        const SizedBox(height: 8),
        if (_catalogLoading)
          const Padding(
            padding: EdgeInsets.all(24),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (_catalogError != null)
          Text(_catalogError!)
        else if (_catalogTab == 0)
          ...dropIns.map((s) {
            final price = _prices[s.serviceId] ?? 0;
            return ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(s.serviceName),
              subtitle: Text(
                '${_two(s.startsAt.toLocal().day)}/${_two(s.startsAt.toLocal().month)} '
                '${_two(s.startsAt.toLocal().hour)}:${_two(s.startsAt.toLocal().minute)}',
              ),
              trailing: Text('\$$price'),
              onTap: () => _addDropIn(s, price),
            );
          })
        else
          ..._packs.map(
            (p) => ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(p.name),
              subtitle: Text(
                p.billingPeriod == 'MONTHLY' ? 'Mensual' : 'Único',
              ),
              trailing: Text('\$${p.price}'),
              onTap: () => _addPack(p),
            ),
          ),
      ],
    );
  }

  Widget _buildCarrito() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Carrito', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 4),
        if (_cart.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Text('Vacío. Tocá un ítem del catálogo.'),
          )
        else
          ..._cart.map(
            (i) => ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(i.label),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('\$${i.price}'),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => setState(() => _cart.remove(i)),
                  ),
                ],
              ),
            ),
          ),
        const SizedBox(height: 8),
        Text('Total \$$_total', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        Text('Medio', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 6),
        _MedioCheck(
          selected: _medio == 'CASH',
          label: 'Efectivo (suma al cierre)',
          onTap: () => setState(() => _medio = 'CASH'),
        ),
        const SizedBox(height: 8),
        _MedioCheck(
          selected: _medio == 'MP',
          label: 'Mercado Pago (link único)',
          onTap: () => setState(() => _medio = 'MP'),
        ),
        if (_medio == 'MP')
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              'Se genera un solo link con el total del carrito. '
              'Cada ítem se activa al aprobarse el pago.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: _member == null || _cart.isEmpty
              ? null
              : (_medio == 'CASH' ? _cobrarCash : _cobrarMp),
          child: Text(_medio == 'CASH' ? 'Cobrar efectivo' : 'Crear link MP'),
        ),
        if (_mpUrl != null) ...[
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => _openUrl(_mpUrl!),
            child: const Text('Abrir link'),
          ),
          TextButton(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: _mpUrl!));
              if (!mounted) {
                return;
              }
              ScaffoldMessenger.of(
                context,
              ).showSnackBar(const SnackBar(content: Text('Link copiado')));
            },
            child: const Text('Copiar link'),
          ),
        ],
      ],
    );
  }

  Widget _buildDebitos() {
    final view = _debitView;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'El alta con tarjeta (Card Brick) se hace en el panel web. '
          'Acá ves la cola, el mandato del afiliado y la baja.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 12),
        if (_member != null) ...[
          Text('Afiliado', style: Theme.of(context).textTheme.titleMedium),
          if (view?.mandate != null) ...[
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(view!.mandate!.packName),
              subtitle: Text(view.mandate!.status),
              trailing: TextButton(
                onPressed: () => _cancelMandate(view.mandate!.id),
                child: const Text('Baja'),
              ),
            ),
          ] else
            Text(
              view?.monthlyName != null
                  ? 'Mensual vigente: ${view!.monthlyName}. Sin mandato.'
                  : 'Sin mandato de débito.',
            ),
          const SizedBox(height: 16),
        ],
        Text('Cola', style: Theme.of(context).textTheme.titleMedium),
        if (_queue.isEmpty)
          const Text('Nada vencido en la cola.')
        else
          ..._queue.map(
            (m) => ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(m.memberLabel),
              subtitle: Text('${m.packName} · ${m.status}'),
            ),
          ),
      ],
    );
  }
}

/// Opción exclusiva de medio de cobro, con checkbox (un solo tildado).
class _MedioCheck extends StatelessWidget {
  const _MedioCheck({
    required this.selected,
    required this.label,
    required this.onTap,
  });

  final bool selected;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: selected
          ? scheme.primaryContainer.withValues(alpha: 0.55)
          : scheme.surfaceContainerHighest.withValues(alpha: 0.55),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          child: Row(
            children: [
              Checkbox(
                value: selected,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(6),
                ),
                onChanged: (_) => onTap(),
              ),
              Expanded(child: Text(label)),
            ],
          ),
        ),
      ),
    );
  }
}
