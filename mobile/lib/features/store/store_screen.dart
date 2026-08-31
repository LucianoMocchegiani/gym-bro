import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import '../../core/widgets/gym_bro_tabs.dart';
import '../../core/widgets/shared_widgets.dart';
import '../cart/cart_screen.dart';
import '../cart/member_cart_controller.dart';
import '../sessions/sessions_repository.dart';
import 'catalog_card.dart';
import 'history_screen.dart';
import 'store_repository.dart';

/// Tienda: catálogo para comprar (packs + drop-in), espejo de Caja.
///
/// Productos = post-MVP. Historial (pagos / devoluciones) va al menú ⋮.
class StoreScreen extends StatefulWidget {
  /// Crea la pantalla.
  const StoreScreen({super.key});

  @override
  State<StoreScreen> createState() => _StoreScreenState();
}

enum _StoreTab { packs, sessions }

class _StoreScreenState extends State<StoreScreen> {
  _StoreTab _tab = _StoreTab.packs;
  List<MemberPack>? _packs;
  List<MemberSession>? _sessions;
  Set<String> _ownedSessionIds = {};
  bool _mpConnected = false;
  String? _error;

  StoreRepository get _store => context.read<StoreRepository>();
  SessionsRepository get _sessionsRepo => context.read<SessionsRepository>();

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
        _sessionsRepo.listSessions(),
        _store.getMpConnected(),
        _sessionsRepo.listReservations(),
      ]);
      if (!mounted) return;
      final sessions = (results[1] as SessionPage).items;
      final reservations = results[3] as List<MemberReservation>;
      setState(() {
        _packs = results[0] as List<MemberPack>;
        _sessions = sessions
            .where((s) => !s.started && s.dropInPrice != null)
            .toList();
        _mpConnected = results[2] as bool;
        _ownedSessionIds = reservations
            .where((r) => r.status == 'CONFIRMED')
            .map((r) => r.sessionId)
            .toSet();
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e is ApiException ? e.message : 'No se pudo cargar la tienda';
      });
    }
  }

  CatalogItem _packItem(MemberPack pack) {
    return CatalogItem(
      id: pack.id,
      kind: CatalogKind.pack,
      title: pack.name,
      subtitle: pack.description,
      imageUrl: pack.imageUrl,
      badges: [pack.billingLabel],
      price: pack.price,
      details: pack.components.map((c) {
        if (c.creditAmount != null) {
          return '${c.serviceName} · ${c.creditAmount} créditos';
        }
        if (c.serviceType == 'ACCESO_LIBRE') {
          return '${c.serviceName} · Acceso libre';
        }
        return c.serviceName;
      }).toList(),
      enabled: _mpConnected,
    );
  }

  CatalogItem _sessionItem(MemberSession session) {
    final bits = <String>[
      formatDateTimeShort(session.startsAt),
      if (session.branchName != null) session.branchName!,
    ];
    final owned = _ownedSessionIds.contains(session.id);
    return CatalogItem(
      id: session.id,
      kind: CatalogKind.session,
      title: session.serviceName,
      subtitle: bits.join(' · '),
      imageUrl: session.serviceImageUrl,
      badges: [
        if (owned) 'Comprada',
        'Drop-in',
        'Única sesión',
      ],
      price: session.dropInPrice!,
      details: [
        if (session.instructorName != null) 'Con ${session.instructorName}',
      ],
      enabled: _mpConnected && !owned,
      owned: owned,
    );
  }

  void _addPack(MemberPack pack) {
    final cart = context.read<MemberCartController>();
    final added = cart.add(
      MemberCartLine(
        kind: MemberCartKind.pack,
        id: pack.id,
        title: pack.name,
        subtitle: pack.billingLabel,
        amount: pack.price,
      ),
    );
    if (!added) {
      _snack('Este pack ya está en el carrito');
      return;
    }
    showAddedToCartSnack(context);
  }

  void _addSession(MemberSession session) {
    if (_ownedSessionIds.contains(session.id)) {
      _snack('Ya tenés esta sesión');
      return;
    }
    final price = session.dropInPrice;
    if (price == null) return;
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
      _snack('Este drop-in ya está en el carrito');
      return;
    }
    showAddedToCartSnack(context);
  }

  void _snack(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tienda'),
        actions: const [
          CartAppBarButton(),
          HistoryAppBarButton(),
        ],
      ),
      body: Column(
        children: [
          GymBroTabs(
            tabs: const [
              GymBroTab(label: 'Packs', icon: Icons.inventory_2_outlined),
              GymBroTab(label: 'Sesiones', icon: Icons.event_available_outlined),
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
    if (_packs == null || _sessions == null) {
      return const Center(child: CircularProgressIndicator());
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: switch (_tab) {
        _StoreTab.packs => _buildList(
            items: _packs!,
            emptyIcon: Icons.storefront_outlined,
            emptyMessage: 'No hay packs disponibles por ahora.',
            itemBuilder: (pack) => CatalogCard(
              item: _packItem(pack),
              onAddToCart: () => _addPack(pack),
            ),
          ),
        _StoreTab.sessions => _buildList(
            items: _sessions!,
            emptyIcon: Icons.event_available_outlined,
            emptyMessage: 'No hay sesiones con drop-in por ahora.',
            itemBuilder: (session) => CatalogCard(
              item: _sessionItem(session),
              onAddToCart: () => _addSession(session),
            ),
          ),
      },
    );
  }

  Widget _buildList<T>({
    required List<T> items,
    required IconData emptyIcon,
    required String emptyMessage,
    required Widget Function(T item) itemBuilder,
  }) {
    if (items.isEmpty) {
      return ListView(
        children: [
          GymBroMessagePane(icon: emptyIcon, message: emptyMessage),
        ],
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
      itemCount: items.length,
      itemBuilder: (context, i) {
        return Padding(
          padding: EdgeInsets.only(top: i == 0 ? 0 : 12),
          child: itemBuilder(items[i]),
        );
      },
    );
  }
}
